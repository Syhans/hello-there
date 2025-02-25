Mostly a joke repo for me to mess around with when it comes to things related to Docker and CI workflows.

---

- Vite App, statically built and dockerzied with Nginx.
- Github workflow to:
  - Login to private docker registry
  - Build and tag the image
  - Push the image to the registry
  - SSH into a deploy server to redeploy (this last step is sus as f\*\*k and should probably be solved with a webhook instead)

---

The deploy server just runs Docker and Traefik. The setup can be replicated on any VPS. To replicate the setup, do the following:

- Perform basic security and SSH hardening steps. For example, follow this guide: https://github.com/dreamsofcode-io/zenstats/blob/main/docs/vps-setup.md
- Setup Docker.
- In the deploy user's home directory, create a `letsencrypt` and `registry/data` directory.
- Create a `scripts/deploy.sh` file, run `chmod +x scripts/deploy.sh` and add the following code:

```sh
#!/bin/bash

echo "Running deployment..."

# Suppress Docker Compose output
docker compose -f /home/$USER/docker-compose.yml pull > /dev/null 2>&1
docker compose -f /home/$USER/docker-compose.yml up -d > /dev/null 2>&1

echo "Deployment completed successfully."
```

- In the deploy user's home directory, create a `docker-compose.yml` file and add the following code, replacing the placeholders for basic auth and domains:

```yml
services:
  traefik:
    image: "traefik:v3.3"
    container_name: "traefik"
    restart: always
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entryPoints.websecure.address=:443"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entryPoints.web.http.redirections.entrypoint.scheme=https"
      - "--log.level=DEBUG"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
      - "--api=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "./letsencrypt:/letsencrypt"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=myresolver"
      # use this command to generate a user password pair: echo $(htpasswd -nB user) | sed -e s/\\$/\\$\\$/g
      - "traefik.http.middlewares.traefik-auth.basicauth.users="
      - "traefik.http.routers.traefik.middlewares=traefik-auth@docker"

  whoami:
    image: "traefik/whoami"
    container_name: "simple-service"
    restart: always
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`whoami.example.com`)"
      - "traefik.http.routers.whoami.entrypoints=websecure"
      - "traefik.http.routers.whoami.tls.certresolver=myresolver"

  registry:
    image: registry:2
    container_name: "registry"
    restart: always
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Methods: "[HEAD,GET,OPTIONS,DELETE]"
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Headers: "[Authorization,Accept,Cache-Control]"
      REGISTRY_HTTP_HEADERS_Access-Control-Expose-Headers: "[Docker-Content-Digest]"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.registry.rule=Host(`registry.example.com`)"
      - "traefik.http.routers.registry.entrypoints=websecure"
      - "traefik.http.routers.registry.tls.certresolver=myresolver"
      # use this command to generate a user password pair: echo $(htpasswd -nB user) | sed -e s/\\$/\\$\\$/g
      - "traefik.http.middlewares.registry-auth.basicauth.users="
      - "traefik.http.routers.registry.middlewares=registry-auth@docker"
    volumes:
      - "./registry/data:/var/lib/registry"

  registry-ui:
    image: joxit/docker-registry-ui:main
    container_name: "registry-ui"
    restart: always
    environment:
      - DELETE_IMAGES=true
      - REGISTRY_TITLE=My Private Docker Registry
      - NGINX_PROXY_PASS_URL=http://registry:5000
      - SINGLE_REGISTRY=true
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.registry-ui.rule=Host(`ui.registry.example.com`)"
      - "traefik.http.routers.registry-ui.entrypoints=websecure"
      - "traefik.http.routers.registry-ui.tls.certresolver=myresolver"
      # use this command to generate a user password pair: echo $(htpasswd -nB user) | sed -e s/\\$/\\$\\$/g
      - "traefik.http.middlewares.registry-ui-auth.basicauth.users="
      - "traefik.http.routers.registry-ui.middlewares=registry-ui-auth@docker"

  hello-there:
    image: registry.example.com/hello-there:latest
    container_name: "hello-there"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hello-there.rule=Host(`hello-there.example.com`)"
      - "traefik.http.routers.hello-there.entrypoints=websecure"
      - "traefik.http.routers.hello-there.tls.certresolver=myresolver"
```

- The final service can be commented out because running it will fail because there is no image yet.
- Run `docker compose up -d`, then login to the registry with the created basic auth credentials using `docker login`.
- Push the `hello-there` image through method of choice (manually or Github workflow in `.github/workflows/docker-image.yml.example`, obviously remove the `.example` and set the secrets in the Github repo).
