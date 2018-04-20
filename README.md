# newrelic-vertica

`newrelic-vertica` provides [New Relic](https://newrelic.com/) instrumentation for the node [vertica](https://github.com/wvanbergen/node-vertica) library.

## Installation

```
npm install newrelic-vertica
```

To use, include the following when you first require `newrelic`:

```
var newrelic = require('newrelic');
newrelic.instrumentDatastore('vertica', require('newrelic-vertica'));
```

That's it!

## Development

### Setup
Run `npm install` inside the repository to install all the dev dependencies.

### Testing
Once all the dependencies are installed, you can execute the unit tests using `npm test`

### Contributing

[Submitting pull requests](CONTRIBUTING.md)