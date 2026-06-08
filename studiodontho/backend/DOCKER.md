# Docker pour Studiodontho

Ce projet utilise Docker pour lancer une base MySQL locale sans XAMPP.

## Services

- `db` : serveur MySQL 8.0
- `phpmyadmin` : interface web pour voir/modifier la base

## Ports

- Application Node.js : `http://localhost:3000`
- MySQL Docker : `127.0.0.1:3307`
- phpMyAdmin : `http://localhost:8080`

Le port MySQL local est `3307` pour eviter un conflit avec XAMPP, qui utilise souvent `3306`.

## Identifiants MySQL

```txt
base     : studiodontho
user     : studiodontho_user
password : studiodontho_password
port     : 3307
```

## Commandes

Lancer la base :

```bash
docker compose up -d
```

Voir les conteneurs :

```bash
docker compose ps
```

Voir les logs MySQL :

```bash
docker compose logs db
```

Arreter les conteneurs :

```bash
docker compose down
```

Supprimer la base et repartir de zero :

```bash
docker compose down -v
docker compose up -d
```

Attention : `down -v` supprime les donnees MySQL stockees dans le volume Docker.

## Initialisation SQL

Au premier lancement, Docker lit :

```txt
database.sql
```

et cree la table `users`.

Docker execute ce fichier seulement quand le volume MySQL est vide. Si tu modifies `database.sql` apres avoir deja lance la base, il faut soit appliquer les changements dans phpMyAdmin, soit repartir de zero avec :

```bash
docker compose down -v
docker compose up -d
```
