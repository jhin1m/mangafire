/* eslint-disable no-undef */
module.exports = {
  extends: ['../../.eslintrc.cjs'],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.eslint.json',
      },
    },
  },
}
