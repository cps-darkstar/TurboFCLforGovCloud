/**
 * Enterprise Encryption Service
 * 
 * This service provides client-side encryption capabilities for the
 * TurboFCL enterprise system, ensuring sensitive data is protected
 * before transmission and storage.
 */

import { SecurityClearanceLevel } from '../types/enterprise';

export interface EncryptionOptions {
  algorithm?: 'AES-GCM' | 'AES-CBC';
  keySize?: 128 | 192 | 256;
  classification?: SecurityClearanceLevel;
  compress?: boolean;
}

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  algorithm: string;
  keyId: string;
  classification?: SecurityClearanceLevel;
  timestamp: string;
  checksum: string;
}

export interface DecryptedData {
  data: string;
  classification?: SecurityClearanceLevel;
  timestamp: Date;
  verified: boolean;
}

class EncryptionService {
  private keys: Map<string, CryptoKey> = new Map();
  private defaultOptions: EncryptionOptions = {
    algorithm: 'AES-GCM',
    keySize: 256,
    compress: false
  };

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    // Initialize default encryption keys
    try {
      await this.generateDefaultKey();
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
    }
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(
    keyId: string = 'default',
    options: EncryptionOptions = {}
  ): Promise<string> {
    try {
      const { algorithm = 'AES-GCM', keySize = 256 } = { ...this.defaultOptions, ...options };
      
      const key = await window.crypto.subtle.generateKey(
        {
          name: algorithm,
          length: keySize
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      this.keys.set(keyId, key);
      
      // Export key for storage (if needed)
      const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
      
      return keyId;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Generate default encryption key
   */
  private async generateDefaultKey(): Promise<void> {
    await this.generateKey('default');
  }

  /**
   * Import an encryption key
   */
  async importKey(
    keyData: JsonWebKey,
    keyId: string,
    options: EncryptionOptions = {}
  ): Promise<void> {
    try {
      const { algorithm = 'AES-GCM' } = { ...this.defaultOptions, ...options };
      
      const key = await window.crypto.subtle.importKey(
        'jwk',
        keyData,
        {
          name: algorithm
        },
        true,
        ['encrypt', 'decrypt']
      );

      this.keys.set(keyId, key);
    } catch (error) {
      console.error('Failed to import encryption key:', error);
      throw new Error('Key import failed');
    }
  }

  /**
   * Encrypt data
   */
  async encrypt(
    data: string,
    keyId: string = 'default',
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    try {
      const { algorithm = 'AES-GCM', classification, compress = false } = { 
        ...this.defaultOptions, 
        ...options 
      };

      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key '${keyId}' not found`);
      }

      // Prepare data
      let processedData = data;
      if (compress) {
        processedData = await this.compressData(data);
      }

      const dataBytes = new TextEncoder().encode(processedData);
      
      // Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
      
      // Encrypt
      const encryptedBytes = await window.crypto.subtle.encrypt(
        {
          name: algorithm,
          iv: iv
        },
        key,
        dataBytes
      );

      // Convert to base64
      const encryptedData = this.arrayBufferToBase64(encryptedBytes);
      const ivBase64 = this.arrayBufferToBase64(iv);
      
      // Generate checksum
      const checksum = await this.generateChecksum(encryptedData + ivBase64);
      
      const result: EncryptedData = {
        data: encryptedData,
        iv: ivBase64,
        algorithm,
        keyId,
        classification,
        timestamp: new Date().toISOString(),
        checksum
      };

      return result;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(
    encryptedData: EncryptedData,
    keyId?: string
  ): Promise<DecryptedData> {
    try {
      const actualKeyId = keyId || encryptedData.keyId;
      const key = this.keys.get(actualKeyId);
      
      if (!key) {
        throw new Error(`Decryption key '${actualKeyId}' not found`);
      }

      // Verify checksum
      const expectedChecksum = await this.generateChecksum(
        encryptedData.data + encryptedData.iv
      );
      const verified = expectedChecksum === encryptedData.checksum;

      if (!verified) {
        throw new Error('Data integrity check failed');
      }

      // Convert from base64
      const dataBytes = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      // Decrypt
      const decryptedBytes = await window.crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: iv
        },
        key,
        dataBytes
      );

      let decryptedText = new TextDecoder().decode(decryptedBytes);
      
      // Decompress if needed
      if (decryptedText.startsWith('COMPRESSED:')) {
        decryptedText = await this.decompressData(decryptedText);
      }

      return {
        data: decryptedText,
        classification: encryptedData.classification,
        timestamp: new Date(encryptedData.timestamp),
        verified
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Encrypt sensitive form data
   */
  async encryptFormData(
    formData: Record<string, any>,
    sensitiveFields: string[],
    classification?: SecurityClearanceLevel
  ): Promise<Record<string, any>> {
    const result = { ...formData };
    
    for (const field of sensitiveFields) {
      if (result[field] !== undefined && result[field] !== null) {
        const fieldValue = typeof result[field] === 'string' 
          ? result[field] 
          : JSON.stringify(result[field]);
        
        const encrypted = await this.encrypt(fieldValue, 'default', { classification });
        result[field] = encrypted;
      }
    }
    
    return result;
  }

  /**
   * Decrypt sensitive form data
   */
  async decryptFormData(
    formData: Record<string, any>,
    encryptedFields: string[]
  ): Promise<Record<string, any>> {
    const result = { ...formData };
    
    for (const field of encryptedFields) {
      if (result[field] && typeof result[field] === 'object' && result[field].data) {
        try {
          const decrypted = await this.decrypt(result[field]);
          
          // Try to parse as JSON first, fall back to string
          try {
            result[field] = JSON.parse(decrypted.data);
          } catch {
            result[field] = decrypted.data;
          }
        } catch (error) {
          console.error(`Failed to decrypt field '${field}':`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }
    
    return result;
  }

  /**
   * Encrypt file data
   */
  async encryptFile(
    file: File,
    classification?: SecurityClearanceLevel
  ): Promise<EncryptedData> {
    try {
      const fileData = await this.fileToBase64(file);
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      };
      
      const dataWithMetadata = JSON.stringify({
        data: fileData,
        metadata
      });
      
      return await this.encrypt(dataWithMetadata, 'default', { 
        classification,
        compress: file.size > 1024 * 1024 // Compress files larger than 1MB
      });
    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file data
   */
  async decryptFile(encryptedData: EncryptedData): Promise<File> {
    try {
      const decrypted = await this.decrypt(encryptedData);
      const fileInfo = JSON.parse(decrypted.data);
      
      const fileData = this.base64ToArrayBuffer(fileInfo.data);
      const metadata = fileInfo.metadata;
      
      return new File([fileData], metadata.name, {
        type: metadata.type,
        lastModified: metadata.lastModified
      });
    } catch (error) {
      console.error('File decryption failed:', error);
      throw new Error('File decryption failed');
    }
  }

  /**
   * Generate secure hash
   */
  async generateHash(data: string): Promise<string> {
    try {
      const dataBytes = new TextEncoder().encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBytes);
      return this.arrayBufferToBase64(hashBuffer);
    } catch (error) {
      console.error('Hash generation failed:', error);
      throw new Error('Hash generation failed');
    }
  }

  /**
   * Verify data integrity
   */
  async verifyIntegrity(data: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.generateHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Integrity verification failed:', error);
      return false;
    }
  }

  // Private helper methods

  private async generateChecksum(data: string): Promise<string> {
    return await this.generateHash(data);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression marker - in a real implementation,
    // you would use a compression library like pako
    return `COMPRESSED:${data}`;
  }

  private async decompressData(compressedData: string): Promise<string> {
    // Simple decompression - remove the marker
    return compressedData.replace('COMPRESSED:', '');
  }

  /**
   * Clear all encryption keys (for logout/security)
   */
  clearKeys(): void {
    this.keys.clear();
  }

  /**
   * Check if encryption is available
   */
  isAvailable(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  }

  /**
   * Get available algorithms
   */
  getAvailableAlgorithms(): string[] {
    return ['AES-GCM', 'AES-CBC'];
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
export default encryptionService;
