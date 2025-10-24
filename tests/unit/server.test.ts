import { createServer } from 'http';
import { Request, Response } from 'express';
import { app } from '../server';

describe('Server', () => {
    let server: any;

    beforeAll((done) => {
        server = createServer(app);
        server.listen(3000, () => {
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should respond with a 200 status for the root endpoint', async () => {
        const response = await fetch('http://localhost:3000/');
        expect(response.status).toBe(200);
    });

    it('should return JSON data for a specific endpoint', async () => {
        const response = await fetch('http://localhost:3000/some-endpoint');
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('key');
    });

    it('should handle 404 errors', async () => {
        const response = await fetch('http://localhost:3000/non-existent-endpoint');
        expect(response.status).toBe(404);
    });
});