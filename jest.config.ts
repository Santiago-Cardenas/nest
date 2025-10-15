// jest.config.ts
// ✅ Evita errores en compilación de producción (Render) si ts-jest no está instalado.

let config: any;

try {
  // Importamos el tipo solo si está disponible (entorno local/test)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { defaults } = require('ts-jest/presets');
  config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',

    // Keep default test discovery (spec files) but the coverage collection will be limited
    testMatch: ['**/?(*.)+(spec|test).ts'],

    // Collect coverage only from service and controller implementation files
    collectCoverageFrom: [
      'src/**/*.service.ts',
      'src/**/*.controller.ts',
    ],

    // Exclude patterns
    coveragePathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/src/.*/(dto|dtos|entities|interfaces)/',
      '<rootDir>/src/config/',
      '<rootDir>/src/seed/',
      '<rootDir>/src/auth/',
      '\\.(spec|test)\\.ts$',
      '\\.(module)\\.ts$',
      '<rootDir>/src/main.ts',
    ],

    coverageDirectory: '<rootDir>/coverage/unit',
    coverageReporters: ['text', 'lcov', 'html'],

    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json',
      },
    },

    verbose: true,
  };
} catch {
  // En entorno de producción (Render), ignoramos completamente Jest.
  config = {};
}

export default config;
