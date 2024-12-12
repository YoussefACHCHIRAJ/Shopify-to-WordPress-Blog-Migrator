const { default: axios } = require("axios");
const { BLOGS } = require("./blogs");
const { shopifyClient, wpClient } = require("./lib");
const path = require("path");
const FormData = require("form-data");
const fs = require("fs");

const { updateLinksHrefDomain } = require("./utils/functions");
require("dotenv").config();

const wordpress_email = process.env.wordpress_email;
const wordpress_token = process.env.wordpress_token;

const Authorization = `Basic ${Buffer.from(
  `${wordpress_email}:${wordpress_token}`
).toString("base64")}`;

async function fetchShopifyArticles() {
  const { data } = await shopifyClient.get("articles.json");

  return data.articles;
}

async function fetchShopifyArticleForSingleBlog(blogId) {
  const { data } = await shopifyClient.get(`blogs/${blogId}/articles.json`);

  return data.articles;
}

async function fetchWooMediaBySlug(slug) {
  const { data } = await wpClient.get(`media`, {
    params: { slug },
    headers: { Authorization },
  });

  if (data.length > 0) return data[0];

  return null;
}

async function fetchWooArticleBySlug(slug) {
  const { data } = await wpClient.get(`posts`, {
    params: { slug },
    headers: { Authorization },
  });

  if (data.length > 0) return data[0];

  return null;
}

async function createWooArticle(payload) {
  const { data } = await wpClient.post("posts", payload, {
    headers: { Authorization },
  });

  return data;
}

async function fetchShopifyArticleMedia(url) {
  const { data } = await axios.get(url, { responseType: "stream" });

  return data;
}

async function uploadWooMedia(localPath, fileName) {
  const form = new FormData();

  const reader = fs.createReadStream(localPath);

  form.append("file", reader, { filename: `${fileName}.png` });

  const headers = {
    ...form.getHeaders(),
    Authorization,
  };

  const { data } = await wpClient.post("media", form, { headers });

  return data;
}

async function uploadMediaLocally(imageUrl) {
  const imageStream = await fetchShopifyArticleMedia(imageUrl);

  const localPath = path.join(__dirname, `/uploads/image.png`);

  const writer = fs.createWriteStream(localPath);

  imageStream.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(localPath));
    writer.on("error", reject);
  });
}

(async () => {
  const newsBlog = BLOGS.news;
  const articles = await fetchShopifyArticleForSingleBlog(newsBlog.id);

  for (const article of articles) {
    const wooArticle = await fetchWooArticleBySlug(article.handle);

    if (wooArticle) {
      console.log(
        `================= Article ${article.title} already exists. Skip =================`
      );

      continue;
    }

    const filename = path.basename(article.image.src).split(".")[0];
    let featuredMedia = await fetchWooMediaBySlug(filename);

    if (!featuredMedia) {
      const localPath = await uploadMediaLocally(article.image.src);

      const uploadedMedia = await uploadWooMedia(localPath, filename);

      console.log(`################ New Media created ################`);

      featuredMedia = uploadedMedia;
    } else {
      console.log(`____________ Media already exists ____________`);
    }

    const updatedArticleBody = updateLinksHrefDomain(
      article.body_html,
      "nomad33.com",
      "atelierbeni.com"
    );
    const articlePayload = {
      slug: article.handle,
      status: "publish",
      title: article.title,
      content: updatedArticleBody,
      tags: article.tags,
      featured_media: featuredMedia.id,
    };

    await createWooArticle(articlePayload);

    console.log(`----------- Article ${article.title} created -----------`);
  }
})();
