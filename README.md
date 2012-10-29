# JoinJS

JoinJS packages up CommonJS modules for the browser.

### Usage

First install the package via npm:

    npm install -g git+https://github.com/olegp/joinjs.git
    
Then compile with:

    joinjs ./dir/index output.js
   
This will package up all the modules in `./dir/`, use the module in the file 
`index.js` as the entry point and write out the result to `output.js`.
