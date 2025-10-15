# Despliegue automático y CI

Este documento explica los pasos mínimos para que GitHub Actions ejecute las pruebas e2e usando Postgres y para que el repositorio dispare despliegues en Render.

## Requisitos para la CI (GitHub Actions)

El workflow de CI está configurado para arrancar un servicio Postgres en el job. No es necesario cambiar nada si tu código usa las variables de entorno siguientes, ya que el workflow exporta automáticamente estas variables:

- DB_TYPE: postgres
- DB_HOST: 127.0.0.1
- DB_PORT: 5432
- DB_USERNAME: postgres
- DB_PASSWORD: postgres
- DB_DATABASE: biblioicesi_test

Si quieres usar otras credenciales, actualiza `.github/workflows/ci.yml`.

> Nota: el trabajo de CI espera a que Postgres responda antes de ejecutar los tests e2e.

## Despliegue en Render (Deploy Hook)

1. En Render crea un Deploy Hook para el servicio que quieres desplegar. Copia la URL del hook.
2. En GitHub ve a Settings → Secrets and variables → Actions → New repository secret.
   - Name: `RENDER_DEPLOY_HOOK`
   - Value: la URL del Deploy Hook de Render
3. En el repositorio ya existe `.github/workflows/deploy-render.yml`. Cuando hagas push a la rama `main`, el workflow ejecutará pruebas y, si pasan, hará un POST al Deploy Hook para activar el despliegue.

## Variables adicionales que tu app necesita en producción

En Render configura las variables de entorno (`Environment`) para la aplicación:

- DB_TYPE: postgres
- DB_HOST: el host de la base de datos de Render o del add-on
- DB_PORT: 5432
- DB_USERNAME
- DB_PASSWORD
- DB_DATABASE
- JWT_SECRET (o como lo tengas configurado)
- GOOGLE_BOOKS_API_KEY (opcional)


## Notas finales

Si prefieres que CI use sqlite en lugar de Postgres, edita `.github/workflows/ci.yml` y elimina el bloque `services.postgres` y cambia `DB_TYPE` a `sqlite`.

Si necesitas que el workflow haga build de la imagen Docker y la publique, dime el registry (Docker Hub / GitHub Container Registry / otra) y lo añadiré al workflow.
