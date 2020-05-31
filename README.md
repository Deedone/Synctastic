![logo](./logo.jpg)
===

Complete solution to sync videos between browsers.
Includes server and a browser plugin.
Inspired by SyncTube, but designed to work on all websites that use HTML5 video.


# Dependencies
* go
* npm
* webpack
# Building

### Server
`go build`

### Plugin
```shell
cd extension
npm install
npx webpack
cd popup
npm install
npx webpack
```

# Running

### Person 1
1. Run server
2. Install the plugin
3. Create room
4. Start video in the browser
5. Wait for other person
6. Enjoy synchronized watch experience

### Person 2
1. Install the plugin
2. Join room
3. Navigate to the page containing the video
4. Enjoy synchronized watch experience
