# Server Config

```
kubectl create secret generic df2-server-config --from-file=src/config/config.json
```

# Image Pull Secret

For pulling images from dockerhub

```
kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ --docker-username={{}} --docker-password={{}} --docker-email={{}}
```

# Ingress

from: https://www.digitalocean.com/community/tutorials/how-to-set-up-an-nginx-ingress-with-cert-manager-on-digitalocean-kubernetes

```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.26.1/deploy/static/mandatory.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.26.1/deploy/static/provider/cloud-generic.yaml
```