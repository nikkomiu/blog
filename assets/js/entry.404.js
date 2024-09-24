import Fuse from "fuse.js";

const itemObjKeys = ["title", "description", "link"];

const fuseOpts = {
  includeScore: true,
  threshold: 0.1,
  keys: ["link"],
};

async function loadFusePages() {
  const res = await fetch("/index.xml");
  const rawData = await res.text();
  const parser = new DOMParser();
  const xmlData = await parser.parseFromString(rawData, "text/xml");

  // Map the items in the channel (pages) to fuse-structured data for processing
  const fuseData = [...xmlData.querySelectorAll("channel > item")].map((item) =>
    itemObjKeys.reduce(
      (prev, cur) => ({
        ...prev,
        [cur]: item.querySelector(cur).innerHTML,
      }),
      {}
    )
  );

  return new Fuse(fuseData, fuseOpts);
}

function PageResult(props) {
  console.log(props);
  const parser = new DOMParser();

  return `
    <article class="post py-8">
      <h2 class="post-title !text-xl">
        <a href="${props.item.link}">${props.item.title}</a>
      </h2>
      <a href="${
        props.item.link
      }" class="text-sm mb-4 text-purple-600 hover:text-purple-300 hover:underline relative bottom-4">${
    props.item.link
  }</a>
      <div class="post-content text-neutral-300">
        ${
          parser.parseFromString(props.item.description, "text/html").body
            .innerText
        }
      </div>
    </article>
  `;
}

async function onPageLoad() {
  const fuse = await loadFusePages();

  const res = fuse.search(window.location.toString());

  let resultsHTML = "";

  for (let i = 0; i < 3; i++) {
    resultsHTML += PageResult(res[i]);
  }

  document.querySelector(".similar-pages .page-results").innerHTML =
    resultsHTML;
  document.querySelector(".similar-pages").classList.remove("hidden");
}

window.addEventListener("load", onPageLoad);
