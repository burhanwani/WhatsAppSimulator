/**
 * Cryptography utilities for End-to-End Encryption
 * Uses Web Crypto API for RSA and AES operations
 */

// Generate RSA key pair (2048-bit)
export async function generateRSAKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );
    return keyPair;
}

// Export public key to PEM format
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    const pem = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
    return pem;
}

// Import public key from PEM format
export async function importPublicKey(pem: string): Promise<CryptoKey> {
    const pemContents = pem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '');
    const binaryDer = atob(pemContents);
    const binaryDerArray = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) {
        binaryDerArray[i] = binaryDer.charCodeAt(i);
    }

    const key = await window.crypto.subtle.importKey(
        'spki',
        binaryDerArray.buffer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256',
        },
        true,
        ['encrypt']
    );
    return key;
}

// Encrypt message with recipient's public key
export async function encryptMessage(
    message: string,
    recipientPublicKey: CryptoKey
): Promise<{ encrypted_payload: string; encrypted_key: string }> {
    // Generate AES key
    const aesKey = await window.crypto.subtle.generateKey(
        {
            name: 'AES-CBC',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    // Encrypt message with AES
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            iv: iv,
        },
        aesKey,
        messageData
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    const encrypted_payload = btoa(String.fromCharCode(...combined));

    // Export AES key as raw bytes
    const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey);

    // Encrypt AES key with RSA public key
    const encryptedKey = await window.crypto.subtle.encrypt(
        {
            name: 'RSA-OAEP',
        },
        recipientPublicKey,
        exportedKey
    );

    const encrypted_key = btoa(String.fromCharCode(...new Uint8Array(encryptedKey)));

    return {
        encrypted_payload,
        encrypted_key,
    };
}

// Decrypt message with private key
export async function decryptMessage(
    encrypted_payload: string,
    encrypted_key: string,
    privateKey: CryptoKey
): Promise<string> {
    // Decrypt AES key with RSA private key
    const encryptedKeyBuffer = Uint8Array.from(atob(encrypted_key), c => c.charCodeAt(0));
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
        {
            name: 'RSA-OAEP',
        },
        privateKey,
        encryptedKeyBuffer
    );

    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        {
            name: 'AES-CBC',
            length: 256,
        },
        false,
        ['decrypt']
    );

    // Decode encrypted payload
    const combined = Uint8Array.from(atob(encrypted_payload), c => c.charCodeAt(0));
    const iv = combined.slice(0, 16);
    const encryptedData = combined.slice(16);

    // Decrypt message with AES
    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: iv,
        },
        aesKey,
        encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
}

// Generate UUID for message IDs
export function generateMessageId(): string {
    return crypto.randomUUID();
}
