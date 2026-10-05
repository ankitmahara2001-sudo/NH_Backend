import globals from 'globals';
import { javascriptBase } from './eslint.base.mjs';

export default [
  ...javascriptBase,
  { files: ['**/*.js', '**/*.mjs'], languageOptions: { globals: globals.node } },
  {
    // sequelize-cli loads these with require(), so they are CommonJS.
    files: ['**/*.cjs', '.sequelizerc'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
];
