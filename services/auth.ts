
import { User } from '../types';
import { supabase } from './supabase';
import { storageService as localStorageService } from './storage';

const SESSION_KEY = 'adgenius_user_session';

// Hybrid Auth Service
// Falls back to IndexedDB/LocalStorage if Supabase is not configured.
export const authService = {
  
  signup: async (email: string, password: string, name: string): Promise<User> => {
    if (supabase) {
        // --- Supabase Path ---
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });
        
        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        // If email confirmation is enabled, session will be null.
        // We notify the user instead of trying to force a login.
        if (!data.session) {
            throw new Error("Account created! Please check your email to verify your account.");
        }

        // If we have a session, we can attempt to ensure the profile exists.
        // The SQL Trigger should have done this, but we can do a safe upsert just in case.
        await supabase.from('users').upsert({
            id: data.user.id,
            email: data.user.email,
            name: name
        }, { onConflict: 'id', ignoreDuplicates: true });

        const user: User = { id: data.user.id, email: data.user.email || '', name: name };
        return authService.createSession(user);
    } else {
        // --- Local Offline Path ---
        // Check if user exists
        const existing = await localStorageService.getUserByEmail(email);
        if (existing) throw new Error("User already exists");

        const newUser: User = {
            id: crypto.randomUUID(),
            email,
            name
        };
        
        await localStorageService.createUser(newUser, password);
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));
        
        return authService.createSession(newUser);
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    if (supabase) {
        // --- Supabase Path ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        let name = data.user.user_metadata?.full_name || 'User';
        
        // HEALING: Ensure public.users record exists. 
        // If the Trigger failed or didn't run, this fixes the data state.
        const { data: profile } = await supabase.from('users').select('name').eq('id', data.user.id).maybeSingle();
        
        if (!profile) {
            // Profile missing. Create it now that we have a valid session.
            const { error: insertError } = await supabase.from('users').insert({
                id: data.user.id,
                email: data.user.email || email,
                name: name
            });
            
            if (insertError) {
                console.warn("Failed to create user profile on login", insertError);
            }
        } else if (profile.name) {
            name = profile.name;
        }

        const user: User = { id: data.user.id, email: data.user.email || '', name: name };
        return authService.createSession(user);
    } else {
        // --- Local Offline Path ---
        const storedUser = await localStorageService.getUserByEmail(email);
        if (!storedUser) throw new Error("Invalid email or password");
        if (storedUser.password !== password) throw new Error("Invalid email or password");
        
        // Simulate network delay
        await new Promise(r => setTimeout(r, 600));

        const user: User = { id: storedUser.id, email: storedUser.email, name: storedUser.name };
        return authService.createSession(user);
    }
  },

  logout: async (): Promise<void> => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  },

  getUser: (): User | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  createSession: (user: User): User => {
    const publicUser: User = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
    return publicUser;
  },

  syncSession: async (): Promise<User | null> => {
    if (!supabase) return authService.getUser(); // No sync needed for local
    
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
         let name = data.session.user.user_metadata?.full_name || 'User';
         const { data: profile } = await supabase.from('users').select('name').eq('id', data.session.user.id).maybeSingle();
         if (profile?.name) name = profile.name;

         const user = {
             id: data.session.user.id,
             email: data.session.user.email || '',
             name: name
         };
         return authService.createSession(user);
    }
    return null;
  }
};
