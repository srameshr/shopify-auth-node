# Shopify Auth Node

NodeJS + Express authentication handler for public shopify apps that:
1. Provides the path for Shopify callbacks during installation.
2. Validates & Handles authentication automatically.
3. Provides accessToken & shop name in the callback after successful authentication.
4. Provides a re-login path
5. Provides a path for GDPR handler

## Installation

Use the package manager [npm](http://npmjs.com/package/shopify-auth-node) to install Shopify Auth Node.

```bash
npm install shopify-auth-node
```

## Usage

```
const shopifyAuthNode = require('shopify-auth-node');
const express = require('express');

const app = express();

shopifyAuthNode.bootstrap({
	app, // express server instance
	shopifyAppScopes: 'read_script_tags,write_script_tags', // etc
	shopifyApiKey: 'your_api_key',
	shopifyApiSecret: 'your_api_secret',
	shopifyAppUri: 'your_app_url_which_hosts_this_code',
	successCallBack:  ({ accessToken, shop, res }) => yourHandler()
})
```

## Setting on Shopify App Setup Page
1. Set your app URL to ```https://your_app_url.xyz/shopify```
2. Set your GDPR URL's to:
  ```
https:///your_app_url.xyz/shopify/webhooks/customers/data_request
https://your_app_url.xyz/shopify/webhooks/customers/redact
https://your_app_url.xyz/shopify/webhooks/shop/redact
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)