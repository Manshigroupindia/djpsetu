import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      'firebase',
      '@firebase/app',
      '@firebase/auth',
      '@firebase/firestore',
      '@firebase/storage',
      '@firebase/analytics',
      '@firebase/component',
      '@firebase/util',
      'react',
      'react-dom',
      'react-router-dom',
    ],
    alias: {
      'firebase/app': path.resolve(import.meta.dirname, 'node_modules/firebase/app'),
      'firebase/auth': path.resolve(import.meta.dirname, 'node_modules/firebase/auth'),
      'firebase/firestore': path.resolve(import.meta.dirname, 'node_modules/firebase/firestore'),
      'firebase/storage': path.resolve(import.meta.dirname, 'node_modules/firebase/storage'),
      'firebase/analytics': path.resolve(import.meta.dirname, 'node_modules/firebase/analytics'),
      '@firebase/app': path.resolve(import.meta.dirname, 'node_modules/@firebase/app'),
      '@firebase/storage': path.resolve(import.meta.dirname, 'node_modules/@firebase/storage'),
      '@firebase/component': path.resolve(import.meta.dirname, 'node_modules/@firebase/component'),
    },
  },
});
