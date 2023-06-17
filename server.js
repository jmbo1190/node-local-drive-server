const express = require("express");
const fs = require("fs");
const path = require("path");
const isTextOrBinary = require('istextorbinary');


const app = express();
const port = 3000;

// Root of local filesystem to serve
const fsRoot = "/";

// Array of root folders to serve
const rootFolders = [
  "Users",
  "Applications",
  // Add more folders here as needed
];

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
        // If the requested path is a directory, send the directory contents as JSON or HTML based on the 'content' parameter
        const contentParam = req.query.content;

        fs.readdir(filePath, (err, files) => {
          if (err) {
            // Error reading the directory
            res.status(500).send("Error reading directory");
            return;
          }

          if (contentParam === "json") {
            // Send directory contents as JSON
            res.json(files);
          } else {
            // Send directory contents as HTML
            const html = generateDirectoryListing(
              filePath,
              files,
              requestedPath
            );
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
          const textFileExtensions = ['.txt', '.lst', '.sas', '.R', '.cfg', '.job', '.mnf', '.log', '.Rlog'];
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

// Function to generate HTML for the directory listing
function generateDirectoryListing(directoryPath, files, requestedPath) {
  const parentPath = path.dirname(requestedPath);

  let html = `
    <html>
    <head>
      <title>Directory Listing</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        h1 {
          margin-bottom: 20px;
        }
        ul {
          list-style-type: none;
          padding-left: 0;
        }
        li {
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <h1>Directory Listing</h1>
      <ul>
        <li><a href="/local/${parentPath}">..</a></li>
  `;

  // Generate links for each file and subfolder
  files.forEach((file) => {
    const fileLink = path.join(requestedPath, file);
    const fileStats = fs.statSync(path.join(directoryPath, file));
    const isDirectory = fileStats.isDirectory();
    const linkText = isDirectory ? `${file}/` : file;
    const link = `<a href="/local/${fileLink}">${linkText}</a>`;
    html += `<li>${link}</li>`;
  });

  html += `
      </ul>
    </body>
    </html>
  `;

  return html;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
