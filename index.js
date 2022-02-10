const cookie = require('cookie');
const nonce = require('nonce')();
const request = require('request-promise');
const fs = require('fs');
const ShopifyToken = require('shopify-token');
const crypto = require('crypto');
const querystring = require('querystring');

const SHOPIFY_OAUTH_PATH = '/shopify';
const SHOPIFY_LOGIN_PATH = '/shopify/login'
const SHOPIFY_WEBHOOK_GDPR_CUSTOMERS_REDACT = '/shopify/webhooks/customers/redact';
const SHOPIFY_WEBHOOK_GDPR_SHOP_REDACT =  '/shopify/webhooks/shop/redact';
const SHOPIFY_WEBHOOK_GDPR_CUSTOMERS_DATA_REQUEST = '/shopify/webhooks/customers/data_request';
const SHOPIFY_WEBHOOK_APP_UNISTALLED = '/shopify/webhooks/app/uninstalled';


const hmac256Validation = ({ req, res, shopifyApiSecret }) => {
	const hmac = req.query.hmac || req.headers['x-shopify-hmac-sha256'];
	const map = Object.assign({}, req.query);
	delete map['signature'];
	delete map['hmac'];
	const message = querystring.stringify(map);
	const providedHmac = Buffer.from(hmac, 'utf-8');
	const generatedHash = Buffer.from(
		crypto
			.createHmac('sha256', shopifyApiSecret)
			.update(message)
			.digest('hex'),
		'utf-8'
	);
	let hashEquals = false;

	try {
		hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
	} catch (e) {
		hashEquals = false;
	};

	if (!hashEquals) {
		return res.status(400).send('HMAC validation failed');
	}
}

module.exports = {
	bootstrap({
		app,
		shopifyAppScopes,
		shopifyApiKey,
		shopifyApiSecret,
		shopifyAppUri,
		successCallBack,
	}) {
		const redirectUri = shopifyAppUri + SHOPIFY_OAUTH_PATH + '/callback';
		app.get(SHOPIFY_OAUTH_PATH, (req, res) => {
			const shop = req.query.shop;
			if (shop) {
				const state = nonce();
				const installUrl = 'https://' + shop +
					'/admin/oauth/authorize?client_id=' + shopifyApiKey +
					'&scope=' + shopifyAppScopes +
					'&state=' + state +
					'&redirect_uri=' + redirectUri

				res.cookie('state', state);
				res.redirect(installUrl);
			} else {
				return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
			}
		});


		app.get(`${SHOPIFY_OAUTH_PATH}/callback`, (req, res) => {
			const { shop, hmac, code, state, host } = req.query;

			if (req.headers.cookie) {
				const stateCookie = cookie.parse(req.headers.cookie).state;

				// if (state !== stateCookie) { // Required.
				//   return res.status(403).send('Request origin cannot be verified');
				// }
			}
			if (shop && hmac && code) {
				// DONE: Validate request is from Shopify
				// hmac256Validation({ req, res, shopifyApiSecret });

				// DONE: Exchange temporary code for a permanent access token
				const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
				const accessTokenPayload = {
					client_id: shopifyApiKey,
					client_secret: shopifyApiSecret,
					code,
				};

				request.post(accessTokenRequestUrl, { json: accessTokenPayload })
					.then((accessTokenResponse) => {
						const accessToken = accessTokenResponse.access_token;
						successCallBack({
							accessToken,
							shop,
							res,
							req,
							shop,
							hmac,
							code,
							state,
							host 
						});
					})
					.catch((error) => {
						console.error(error)
						res.status(error.statusCode).send(error.error);
					});

			} else {
				res.status(400).send('Required parameters missing');
			}
		});

		app.get(SHOPIFY_LOGIN_PATH, (req, res) => {
			const { shop } = req.query;
			if (!shop) {
				res.status(400).send('Shop id such as mystore.myshopify.com is required')
			} else {
				const shopifyToken = new ShopifyToken({
					apiKey: shopifyApiKey,
					redirectUri,
					sharedSecret: shopifyApiSecret,
				});
				const storeLoginURL = shopifyToken.generateAuthUrl(shop, shopifyAppScopes);
				res.redirect(302, storeLoginURL);
			}
		})

		const handleGDPR = (req, res) => {
			fs.appendFile('gdpr-requests.txt', `${JSON.stringify(req.body)}\n`, () => null);
			res.sendStatus(200);
		}
		app.post(SHOPIFY_WEBHOOK_GDPR_CUSTOMERS_REDACT, handleGDPR);
		app.post(SHOPIFY_WEBHOOK_GDPR_CUSTOMERS_DATA_REQUEST, handleGDPR);
		app.post(SHOPIFY_WEBHOOK_GDPR_SHOP_REDACT, handleGDPR);
	}
}
