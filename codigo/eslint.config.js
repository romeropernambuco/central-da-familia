// Regras de casa do projeto.
// "error" quebra a verificação automática. "warn" é dívida conhecida: aparece no relatório e não pode crescer.
// A meta é ir transformando cada "warn" em "error" conforme a dívida daquele tipo for zerada.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const LABORATORIO = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l', 'm']

export default tseslint.config(
  {
    // arquivos gerados, material de referência e um oráculo de teste em CommonJS
    ignores: [
      'dist/**',
      'dist-*/**',
      'node_modules/**',
      'src/propostas/referencias/**',
      'src/lib/futuro/paridade-fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // o TypeScript já acusa nome inexistente; a regra do ESLint só repete com falso positivo
      'no-undef': 'off',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Tipos: cada `any` e cada silenciador é um ponto onde o compilador deixou de ajudar
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',

      // Erros engolidos: `catch` vazio precisa de um comentário dizendo por que pode ignorar
      'no-empty': ['warn', { allowEmptyCatch: false }],
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-misleading-character-class': 'warn',
      'no-prototype-builtins': 'warn',
      'no-case-declarations': 'warn',
      'no-async-promise-executor': 'warn',
      'no-useless-assignment': 'warn',
      'prefer-const': 'warn',
      'preserve-caught-error': 'warn',

      // Tamanho: arquivo e função grandes demais não dá para revisar nem testar por partes
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 25],
    },
  },
  {
    // O app de verdade não pode depender das propostas de laboratório (letras). `comuns` e `j` ainda são usadas
    // pelo Início e saem dessa pasta numa etapa própria.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/propostas/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: LABORATORIO.map(l => `**/propostas/${l}/**`),
              message: 'Produção não importa do laboratório de propostas.',
            },
          ],
        },
      ],
    },
  },
  {
    // modelo do service worker: roda fora da página, com as globais próprias dele
    files: ['src/sw.modelo.js'],
    languageOptions: { globals: { ...globals.serviceworker, __ARQUIVOS__: 'readonly' } },
  },
  {
    // Testes e laboratório: sem limite de tamanho; o resto continua valendo
    files: ['src/**/*.test.ts', 'src/**/*.dom-teste.ts', 'src/**/*.fixture.ts', 'src/propostas/**'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
