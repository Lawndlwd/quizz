import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': { target: 'http://localhost:3000', changeOrigin: true },
            '/avatars': { target: 'http://localhost:3000', changeOrigin: true },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
                changeOrigin: true,
                // A browser tab closing its socket.io connection makes Vite's ws proxy
                // write to an already-closed socket → a harmless EPIPE/ECONNRESET that
                // Vite logs as a scary stack trace. Swallow only those; re-log anything else.
                configure: function (proxy) {
                    var ignore = function (err) {
                        return (err === null || err === void 0 ? void 0 : err.code) === 'EPIPE' || (err === null || err === void 0 ? void 0 : err.code) === 'ECONNRESET';
                    };
                    proxy.on('error', function (err) {
                        if (!ignore(err))
                            console.error('[socket.io proxy]', err);
                    });
                    proxy.on('proxyReqWs', function (_proxyReq, _req, socket) {
                        socket.on('error', function (err) {
                            if (!ignore(err))
                                console.error('[socket.io proxy]', err);
                        });
                    });
                },
            },
        },
    },
});
