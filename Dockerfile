FROM node:12

WORKDIR /usr/src/app

COPY ./caro-core ./caro-core/
COPY ./caro-backend ./caro-backend/
RUN cd caro-core && npm install && npm run build && \
	cd ../caro-backend && npm install && npm run build

EXPOSE 8080

CMD cd caro-backend/dist && DEBUG=caro:* node index.js
