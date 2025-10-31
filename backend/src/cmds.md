docker run -d --name redis -p 6379:6379 redis:7-alpine

npx ts-node src/index.ts


## Gateways

http://localhost:4000/auth/spotify?userId=speedwagon1299 - to authorize user

http://localhost:4000/api/playlists?userId=speedwagon1299 - to get all playlists
