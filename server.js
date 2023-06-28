const express = require("express");
const os = require('os');
const fs = require("fs");
const path = require("path");
const isTextOrBinary = require('istextorbinary');


const app = express();
const port = 3000;

// Root of local filesystem to serve
const fsRoot = "/";

// Array of root folders to serve
const rootFolders = [];
console.log(path.posix.normalize(os.homedir()));
let homeDir = os.homedir();
homeDir = homeDir.split(":\\").length === 2 ? homeDir.split(":\\")[1] : homeDir
homeDir = homeDir.replaceAll("\\", "/");
console.log(homeDir);
testFolders =
[ "Users",
  "Applications",
  "Temp",
  // Add more folders here as needed
];
testFolders.push(homeDir);
testFolders.forEach(f => {
  if (fs.existsSync(path.join(fsRoot, f))) rootFolders.push(f)
})
console.log("rootFolders:", rootFolders);

// Define the route
app.get("/local/*", (req, res) => {
  // Extract the file path from the URL
  const requestedPath = req.params[0];
  console.log("requestedPath:", requestedPath);
  let requestedRootPath;
  if (requestedPath.split("/")[0]) {
    requestedRootPath = requestedPath.split("/")[0];
  } else {
    requestedRootPath = requestedPath.split("/")[1];
  }
  console.log("requestedRootPath:", requestedRootPath);
  if (!rootFolders.includes(requestedRootPath)) {
    res.status(404).send("File not found");
    return;
  }
  const filePath = path.join(fsRoot, requestedPath);
  console.log("filePath:", filePath);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist
      res.status(404).send("File not found");
      return;
    }

    // Check if the path is a directory
    fs.stat(filePath, (err, stats) => {
      if (err) {
        // Error getting file stats
        res.status(500).send("Error reading file stats");
        return;
      }

      if (stats.isDirectory()) {
        // If the requested path is a directory, send the directory contents as JSON or HTML 
        // based on the 'content' parameter
        const contentParam = req.query.content;
        const dirPath = filePath;

        fs.readdir(filePath, (err, files) => {
          if (err) {
            // Error reading the directory
            res.status(500).send("Error reading directory");
            return;
          }

          // Generate directory listing
        const directoryListing = files.map(file => {
            const filePath = path.join(dirPath, file);
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              const isDirectory = stats.isDirectory();
              const fileSize = stats.size;
              const fileDate = stats.mtime;
          
              return {
              name: file,
              type: isDirectory ? 'directory' : 'file',
              size: fileSize,
              date: fileDate,
              };
            }
            return null;            
        }).filter(item => item !== null);

          if (contentParam === "json") {
            // Send directory contents as JSON
            res.json(directoryListing);
          } else {
            // Send directory contents as HTML
            const html = generateHtml(directoryListing, req.path);
            res.send(html);
          }
        });
      } else {
        // If the requested path is a file, send the file as a response
        fs.readFile(filePath, (err, data) => {
          if (err) {
            // Error reading the file
            res.status(500).send("Error reading file");
            return;
          }

          // Set the appropriate content type based on file extension
          const ext = path.extname(filePath);
          const textFileExtensions = ['.txt', '.lst', '.sas', '.R', '.cfg', 
            '.job', '.mnf', '.log', '.Rlog'];
          let contentType = "application/octet-stream";
          if (ext === ".html") {
            contentType = "text/html";
          } else if (ext === ".css") {
            contentType = "text/css";
          } else if (ext === ".js") {
            contentType = "application/javascript";
          } else if (ext === '.json') {
            contentType = 'application/json';
          } else if (ext === '.xml') {
            contentType = 'application/xml';
          } else if (textFileExtensions.includes(ext)) {
            contentType = 'text/plain';
          } else if (ext === '.pdf') {
            contentType = 'application/pdf';
          } else if (ext === '.csv') {
            contentType = 'text/csv';
          } else if (ext === '.java') {
            contentType = 'text/x-java-source';
          } else if (ext === '.py') {
            contentType = 'text/x-python';
          } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
          } else if (ext === '.png') {
            contentType = 'image/png';
          } else if (ext === '.gif') {
            contentType = 'image/gif';
          } else if (ext === '.bmp') {
            contentType = 'image/bmp';
          } else {
            // detect if it's binary or text
            const isBinary = !isTextOrBinary.isText(filePath, data);
            contentType = isBinary ? 'application/octet-stream' : 'text/plain';
          } 

          res.setHeader("Content-Type", contentType);
          res.send(data);
        });
      }
    });
  });
});

// Catch-all middleware for non-defined routes
app.use((req, res) => {
  const requestedRoute = req.originalUrl;
  if (rootFolders.length === 0) {
    res.status(404).json({ error: `Route not found: ${requestedRoute}` });
  } else {
    const htmlContent = `
    <h1>Route not found: ${requestedRoute}</h1>
    You may try
    <ul>
    ${rootFolders.map(f => "<li><a href=\"/local/"+f+"\">"+f+"</a></li>").join("\n")}
    </ul>
    `;
    res.status(404).send(htmlContent);
  }
});

function formatDate(date) {
    // const options = { year: 'numeric', month: 'short', day: 'numeric' };
    // return date.toLocaleDateString(undefined, options);
    const isoString = date.toISOString().replace("T", " ");
    return isoString.slice(0, isoString.length - 5) + 'Z';
  }
  
function formatFileSize(size) {
    // if (size === 0) {
    //   return '0.00 b&nbsp;';
    // }
  
    // const units = ['b&nbsp;', 'Kb', 'Mb', 'Gb', 'Tb'];
    // const k = 1024;
    // const i = Math.floor(Math.log(size) / Math.log(k));
  
    // return `${(size / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
    return `${size}`;
  }
  
  function generateHtml(directoryListing, currentPath) {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    const parentLink = `<a href="${parentPath}">..</a>`;
  
    const header = `<h3>Directory Listing: ${currentPath}</h3>`;
    const parentLinkHtml = `<tr><td>${parentLink}</td></tr>`;
  
    const itemsHtml = directoryListing.map(item => {
        console.log(item.name);
        const itemPath = `${currentPath}/${encodeURIComponent(item.name)}`;
        console.log(itemPath);
        const itemLink = `<a href="${itemPath}">${item.name + (item.type === 'directory' ? '/' : '')}</a>`;
        const itemType = `<span>${item.type}</span>`;
        const itemSize = `<span>${formatFileSize(item.size)}</span>`;
        const itemDate = `<span>${formatDate(item.date)}</span>`;
  
        return `<tr><td>${itemLink}</td>`+
            `<td class="no-wrap" style="text-align: right;">${itemSize}</td>`+
            `<td class="no-wrap">${itemDate}</td></tr>`;
    }).join('');
  
    return `<html><body style="white-space: pre;font-family: 'Courier New', Courier, monospace">` +
        `<style>
            .no-wrap {
                white-space: nowrap;
                padding-left: 1em;
            }
            a {
                text-decoration: none;
              }
        </style>` +
        `${header}${parentLinkHtml}<table>${itemsHtml}</table></body></html>`;
  }
  

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
