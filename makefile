init:
	@docker-compose build --no-cache
	@docker-compose run --rm cdk bash /app/init.sh
	@docker-compose run --rm cdk cdk bootstrap
start-%:
	@docker-compose run --rm cdk cdk deploy ${@:start-%=%}
stop-%:
	@docker-compose run --rm cdk cdk destroy ${@:stop-%=%}

start-advance3:
	@docker-compose run --rm cdk cdk deploy -O ./init/advance3/output.json Adv3
	@docker-compose run --rm cdk npm run init-adv-3

start-all:
	@docker-compose run --rm cdk cdk deploy --all
stop-all:
	@docker-compose run --rm cdk cdk destroy --all