import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    // Allow forcing DB type via DB_TYPE env (useful for CI)
    const forcedType = process.env.DB_TYPE;
    const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
    const type = (forcedType as any) ?? (isTestEnv ? 'sqlite' : 'postgres');

    // If a DATABASE_URL is provided (Render, Heroku, etc.), use it. Optionally allow DB_SSL flag.
    if (process.env.DATABASE_URL && type === 'postgres') {
      const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
      return {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        // allow SSL configuration
        ssl,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
      } as TypeOrmModuleOptions;
    }

    return {
      // Use sqlite in-memory when running tests unless overridden
      type,
      database: type === 'sqlite' ? ':memory:' : process.env.DB_DATABASE,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: type === 'sqlite' ? true : process.env.DB_SYNCHRONIZE === 'true',
      // For sqlite in-memory set dropSchema so each test run starts fresh
      dropSchema: type === 'sqlite',
    };
  },
);