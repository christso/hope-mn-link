const port = 8081;

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// allows you to parse JSON into req.body.field
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, function() {
   logger.log(`Mock DMD Explorer is listening on http://localhost:${port}`);
});
