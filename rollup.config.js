import { getRollupConfig } from '@cpuchain/rollup';

const config = [
    getRollupConfig({ input: './src/index.ts' }),
    getRollupConfig({
        input: './src/index.ts',
        browserName: 'bootTables',
    }),
    getRollupConfig({
        input: './src/index.ts',
        browserName: 'bootTables',
        minify: true,
    }),
]

export default config;