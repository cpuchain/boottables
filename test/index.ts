import { describe, expect, it } from 'vitest';
//import { HELLO_WORLD } from '../src/index.js';
const HELLO_WORLD = 'Hello world!';

describe('ts-template', function () {
    it('Hello world', async function () {
        expect(HELLO_WORLD).to.be.a('string');
        expect(HELLO_WORLD.length).to.be.gte(1);
        expect(HELLO_WORLD).to.equal('Hello world!');
    });
});
