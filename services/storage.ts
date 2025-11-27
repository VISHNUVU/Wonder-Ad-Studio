
import { SavedProject, Brand, User, Subscription, UsageStats, MusicTrack } from '../types';
import { STOCK_MUSIC_LIBRARY } from '../constants';

const DB_NAME = 'AdGeniusDB';
const DB_VERSION = 5; // Bumped for Music Library

export interface StoredUser extends User {
  password: string;
}

export class StorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // V1 Stores
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
        
        // V2 Stores
        if (!db.objectStoreNames.contains('brands')) {
          db.createObjectStore('brands', { keyPath: 'id' });
        }

        // V3 Stores
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // V4 SaaS Stores
        if (!db.objectStoreNames.contains('subscriptions')) {
           db.createObjectStore('subscriptions', { keyPath: 'userId' }); // 1:1 user to sub
        }
        if (!db.objectStoreNames.contains('usage')) {
           db.createObjectStore('usage', { keyPath: 'userId' }); // 1:1 user to active usage
        }
        
        // V5 Music Library
        if (!db.objectStoreNames.contains('music_library')) {
           const musicStore = db.createObjectStore('music_library', { keyPath: 'id' });
           // Seed Data
           STOCK_MUSIC_LIBRARY.forEach(track => {
               musicStore.put(track);
           });
        }
      };
    });
  }

  // --- Projects ---

  async saveProject(project: SavedProject): Promise<void> {
    const projectToSave = { ...project, assets: [...project.assets] };
    const blobsToSave: { id: string, blob: Blob }[] = [];

    const processedAssets = await Promise.all(projectToSave.assets.map(async (asset) => {
      const newAsset = { ...asset };
      if (asset.videoUrl && asset.videoUrl.startsWith('blob:')) {
        try {
          const blob = await fetch(asset.videoUrl).then(r => r.blob());
          const blobId = `${project.id}_${asset.sceneId}_video`;
          blobsToSave.push({ id: blobId, blob });
          newAsset.videoUrl = `stored:${blobId}`;
        } catch (e) {
          console.error("Failed to fetch video blob", e);
        }
      }
      if (asset.audioUrl && asset.audioUrl.startsWith('blob:')) {
        try {
          const blob = await fetch(asset.audioUrl).then(r => r.blob());
          const blobId = `${project.id}_${asset.sceneId}_audio`;
          blobsToSave.push({ id: blobId, blob });
          newAsset.audioUrl = `stored:${blobId}`;
        } catch (e) {
          console.error("Failed to fetch audio blob", e);
        }
      }
      return newAsset;
    }));

    projectToSave.assets = processedAssets;
    projectToSave.updatedAt = Date.now();

    const db = await this.dbPromise;
    const tx = db.transaction(['projects', 'blobs'], 'readwrite');
    const projectsStore = tx.objectStore('projects');
    const blobsStore = tx.objectStore('blobs');

    blobsToSave.forEach(item => blobsStore.put(item));
    projectsStore.put(projectToSave);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProjects(userId: string): Promise<SavedProject[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => {
        const allProjects = request.result as SavedProject[];
        const userProjects = allProjects.filter(p => p.userId === userId);
        userProjects.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(userProjects);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadProject(id: string): Promise<SavedProject | null> {
    const db = await this.dbPromise;
    const project = await new Promise<SavedProject | undefined>((resolve, reject) => {
        const tx = db.transaction('projects', 'readonly');
        const req = tx.objectStore('projects').get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    if (!project) return null;

    const tx = db.transaction('blobs', 'readonly');
    const blobsStore = tx.objectStore('blobs');

    const restoredAssets = await Promise.all(project.assets.map(async (asset) => {
       const newAsset = { ...asset };
       if (asset.videoUrl && asset.videoUrl.startsWith('stored:')) {
         const blob = await this.getBlob(blobsStore, asset.videoUrl.replace('stored:', ''));
         if (blob) newAsset.videoUrl = URL.createObjectURL(blob);
       }
       if (asset.audioUrl && asset.audioUrl.startsWith('stored:')) {
         const blob = await this.getBlob(blobsStore, asset.audioUrl.replace('stored:', ''));
         if (blob) newAsset.audioUrl = URL.createObjectURL(blob);
       }
       return newAsset;
    }));

    project.assets = restoredAssets;
    return project;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['projects', 'blobs'], 'readwrite');
    const projectsStore = tx.objectStore('projects');
    const blobsStore = tx.objectStore('blobs');

    const project = await new Promise<SavedProject | undefined>((resolve) => {
        const req = projectsStore.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
    });

    if (project && project.userId === userId) {
        projectsStore.delete(id);
        project.assets.forEach(asset => {
             if (asset.videoUrl?.startsWith('stored:')) blobsStore.delete(asset.videoUrl.replace('stored:', ''));
             if (asset.audioUrl?.startsWith('stored:')) blobsStore.delete(asset.audioUrl.replace('stored:', ''));
        });
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  }

  // --- Brands ---

  async saveBrand(brand: Brand): Promise<void> {
    const brandToSave = { ...brand };
    const blobsToSave: { id: string, blob: Blob }[] = [];

    if (brand.logoLight && brand.logoLight.startsWith('blob:')) {
        try {
            const blob = await fetch(brand.logoLight).then(r => r.blob());
            const blobId = `brand_${brand.id}_logo_light`;
            blobsToSave.push({ id: blobId, blob });
            brandToSave.logoLight = `stored:${blobId}`;
        } catch (e) {
            console.error("Failed to fetch light logo blob", e);
        }
    }

    if (brand.logoDark && brand.logoDark.startsWith('blob:')) {
        try {
            const blob = await fetch(brand.logoDark).then(r => r.blob());
            const blobId = `brand_${brand.id}_logo_dark`;
            blobsToSave.push({ id: blobId, blob });
            brandToSave.logoDark = `stored:${blobId}`;
        } catch (e) {
            console.error("Failed to fetch dark logo blob", e);
        }
    }

    brandToSave.updatedAt = Date.now();

    const db = await this.dbPromise;
    const tx = db.transaction(['brands', 'blobs'], 'readwrite');
    const brandsStore = tx.objectStore('brands');
    const blobsStore = tx.objectStore('blobs');

    blobsToSave.forEach(item => blobsStore.put(item));
    brandsStore.put(brandToSave);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  }

  async getBrands(userId: string): Promise<Brand[]> {
    const db = await this.dbPromise;
    const brands = await new Promise<Brand[]>((resolve, reject) => {
        const tx = db.transaction('brands', 'readonly');
        const store = tx.objectStore('brands');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Brand[]);
        request.onerror = () => reject(request.error);
    });

    const userBrands = brands.filter(b => b.userId === userId);
    
    const tx = db.transaction('blobs', 'readonly');
    const blobsStore = tx.objectStore('blobs');

    const restoredBrands = await Promise.all(userBrands.map(async (b) => {
        const newBrand = { ...b };
        if (newBrand.logoLight?.startsWith('stored:')) {
            const blob = await this.getBlob(blobsStore, newBrand.logoLight.replace('stored:', ''));
            if (blob) newBrand.logoLight = URL.createObjectURL(blob);
        }
        if (newBrand.logoDark?.startsWith('stored:')) {
            const blob = await this.getBlob(blobsStore, newBrand.logoDark.replace('stored:', ''));
            if (blob) newBrand.logoDark = URL.createObjectURL(blob);
        }
        return newBrand;
    }));

    return restoredBrands.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteBrand(id: string, userId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['brands', 'blobs'], 'readwrite');
    const brandsStore = tx.objectStore('brands');
    const blobsStore = tx.objectStore('blobs');

    const brand = await new Promise<Brand | undefined>((resolve) => {
        const req = brandsStore.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
    });

    if (brand && brand.userId === userId) {
        brandsStore.delete(id);
        if (brand.logoLight?.startsWith('stored:')) blobsStore.delete(brand.logoLight.replace('stored:', ''));
        if (brand.logoDark?.startsWith('stored:')) blobsStore.delete(brand.logoDark.replace('stored:', ''));
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  }

  // --- Users ---

  async createUser(user: User, password: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    store.add({ ...user, password }); 
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const db = await this.dbPromise;
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('email');
    const request = index.get(email);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  // --- SaaS / Subscriptions ---

  async getSubscription(userId: string): Promise<Subscription | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
       const tx = db.transaction('subscriptions', 'readonly');
       const req = tx.objectStore('subscriptions').get(userId);
       req.onsuccess = () => resolve(req.result || null);
       req.onerror = () => resolve(null);
    });
  }

  async saveSubscription(subscription: Subscription): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('subscriptions', 'readwrite');
    tx.objectStore('subscriptions').put(subscription);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }

  async getUsage(userId: string): Promise<UsageStats | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
        const tx = db.transaction('usage', 'readonly');
        const req = tx.objectStore('usage').get(userId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
  }

  async saveUsage(usage: UsageStats): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('usage', 'readwrite');
    tx.objectStore('usage').put(usage);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }
  
  // --- Music Library (Phase 2) ---
  
  async getMusicTracks(): Promise<MusicTrack[]> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
        const tx = db.transaction('music_library', 'readonly');
        const req = tx.objectStore('music_library').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });
  }

  // --- Helpers ---

  private getBlob(store: IDBObjectStore, id: string): Promise<Blob | undefined> {
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.blob);
      req.onerror = () => resolve(undefined);
    });
  }
}

export const storageService = new StorageService();
