# localtest

```sh
docker build -t sinario1app:latest . --no-cache
```

```sh
docker run -it --env STAGE=dev  -p 127.0.0.1:3000:3000 --rm sinario1app:latest
```
