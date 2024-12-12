const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function updateLinksHrefDomain(bodyHtml, oldDomain, newDomain) {
  const dom = new JSDOM(bodyHtml);

  const document = dom.window.document;

  // Select all <a> tags and update their href attributes
  document.querySelectorAll("a").forEach((anchor) => {
    if (anchor.href.includes(oldDomain)) {
      anchor.href = anchor.href.replace(oldDomain, newDomain);
    }
  });

  // Serialize the updated HTML back to a string
  return document.body.innerHTML;
}

module.exports = {
  updateLinksHrefDomain,
};
