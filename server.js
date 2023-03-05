const {createServer, STATUS_CODES} = require("http");

const methods = Object.create(null);

createServer((request, response) => {
  let handler = methods[request.method] || notAllowed;
  handler(request)
  .catch(error => {
    if (error.status != null) return error;
    return {body: String(error), status: 500};
  })
  .then(({body, status = 200, type = "text/plain"}) => {
      response.writeHead(status, {"Content-Type": body ? type : 'text/plain'});
      console.log("we are returning: body = ", body);
      if (body && body.pipe) body.pipe(response);
      else {
        // final response has a string body (may be returning directories names in a folder, empty files, etc.)
        response.end(body);
      }
  });
}).listen(8081);

async function notAllowed(request) {
return {
  status: 405,
  body: `Method ${request.method} not allowed.`
};
}

var {parse} = require("url");
var {resolve, sep} = require("path");

const siteContentFolder = 'content';
let baseDirectory = process.cwd();



function urlPath(url) {
  let {pathname} = parse(url);
  let path = resolve(decodeURIComponent(pathname).slice(1));
  if(path == baseDirectory) return path + sep + 'public'+ sep + 'index.html'; // or 'indexWithoutObjects'

  function refuseAccessibility(path){
    if(path == baseDirectory + sep + siteContentFolder ||
       path.startsWith(baseDirectory + sep + siteContentFolder) ||
       path.startsWith(baseDirectory + sep + 'public')){
      return false;
    } else{
      return true;
    }
  }
  if (refuseAccessibility(path)) {
    console.log("Error with accessibility: 403 - Forbidden");
    throw {status: 403, body: "Forbidden"};
  } 
  else return path;


}

const {createReadStream, readFileSync} = require("fs");
const {stat, readdir, readFile} = require("fs").promises;
const mime = require("mime");
const {Transform, Readable } = require("stream")

methods.GET = async function(request) {
  console.log("GET-request. Its url:", request.method, request.url);

  let path = urlPath(request.url);
  console.log("it's path: ", path);
  let stats;
  try {
    stats = await stat(path);
    console.log('[methods.GET] path: ', path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 404, body: "File not found"};
  }
  if (stats.isDirectory()) {
    console.log("[inside get-request] it's a directory");
    return {body: JSON.stringify({type: "directory", value : (await readdir(path)).join("\n")}),
            type: 'application/json'};
  } else if(path.split(sep).includes('public')){
    //it's a public file request like index.html, script.js, etc.
    console.log("[inside get-request] it's a public file request index.html or etc.");
    return {body: createReadStream(path),
            type: mime.getType(path)};
  } else {
    // it's a content file request (from the folder 'content')
    let readStream = createReadStream(path);
    let wrappedStream = new Transform({
      transform(data, encoding, callback){
        let wrappedData = JSON.stringify({type:"file", value: data.toString()});
        //console.log("[Transform] wrappedData:", wrappedData);
        this.push(wrappedData);
        callback();
      }
    })
    // if a readable file is empty, readStream of this file will not go through 
    // the Transform so it will not be wrapped in JSON, although the content-type 
    // of it will be 'application/json' anyway. So we chech site of the file and
    // handle empty case mannually.
    return {body: stats.size ? readStream.pipe(wrappedStream) : JSON.stringify({type:"file", value: ''}),
            type: 'application/json'}; // mime.getType(path)}; // 
  }
};

const {rmdir, rm, unlink} = require("fs").promises;

methods.DELETE = async function(request) {
  console.log("Delete-request");
  let path = urlPath(request.url);
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 204};
  }
  if (stats.isDirectory()) {
    //await rmdir(path);
    await rm(path, { recursive: true });
  }
  else await unlink(path);
  return {status: 204};
};

const {createWriteStream} = require("fs");

function pipeStream(from, to) {
  return new Promise((resolve, reject) => {
    from.on("error", reject);
    to.on("error", reject);
    to.on("finish", resolve);
    from.pipe(to);
  });
}

methods.PUT = async function(request) {
  let path = urlPath(request.url);
  console.log("[PUT request] body: ", request.url);
  
  await pipeStream(request, createWriteStream(path));
  return {status: 204};
};

const {mkdir} = require("fs").promises;

methods.MKCOL = async function(request){
  let path = urlPath(request.url); // returns absolute path from D:/ or C:/
  let stats;
  try{
    stats = await stat(path);
  } catch(e){
    if(e.code != "ENOENT") throw e;
    await mkdir(path);
    return {status: 204};
}

if (stats.isDirectory()) return {status: 204}
else return {status: 400, body : "Not a directory"}
};

methods.POST = async function(request){
console.log("Post request");
if(request.headers['x-request-stats-is-directory-from-path']){
  //console.log('in x-request-stats-from-path HEADER');
  let path = urlPath(request.url);
  let stats;
  try {
    console.log("[Post-request] path': ", path);
    stats = await stat(path);
  } catch (error) {
    //console.log("[Post-request] in error catching");
    if (error.code != "ENOENT") throw error;
    //else return {body : ''}
    else return {status: 404, body: "File not found"};
  }
  return {body : stats.isDirectory() ? 'directory' : 'file'}
}
return {status: 204}
}


/*
$ curl http://localhost:8000/file.txt
File not found
$ curl -X PUT -d hello http://localhost:8000/file.txt
$ curl http://localhost:8000/file.txt
hello
$ curl -X DELETE http://localhost:8000/file.txt
$ curl http://localhost:8000/file.txt
File not found
*/
