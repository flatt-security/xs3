docker compose build cdk --no-cache
docker compose run --rm cdk bash -c "bash /app/init.sh"
rm -rf ./cdk/.eslintrc.json
cp ./develop/cdk-node/.eslintrc.json ./cdk/.eslintrc.json
