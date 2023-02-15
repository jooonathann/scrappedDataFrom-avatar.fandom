const colors = require("colors");
const puppeteer = require("puppeteer-extra");
const fs = require("fs");

// Adblocker use to evade the timeout error because the ads never stops loading
const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require("puppeteer");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(
  AdblockerPlugin({
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
  })
);

const { executablePath } = require("puppeteer");

let obj = {};

(async () => {
  let url = "https://avatar.fandom.com/wiki/Category:Characters";
  let doesNextExist;
  let index = 0;
  do {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 1600 },
      executablePath: executablePath(),
    });
    const page = await browser.newPage();

    await page.goto(url);
    const rows = await page.$$(
      ".category-page__members .category-page__members-wrapper .category-page__member-link"
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const Name = await row.evaluate((el) => el.textContent);
      const characterPage = await row.evaluate((el) => el.getAttribute("href"));
      if (!Name.includes("Category") && !Name.includes("games")) {
        const page = await browser.newPage();
        await page.goto(`https://avatar.fandom.com${characterPage}`, {
          waitUntil: "networkidle0",
          waitUntil: "networkidle2",
        });
        let img = await page.$$("#mw-content-text > div > aside > figure > a");

        if (img.length === 0)
          img = await page.$$(
            "#mw-content-text > div > aside > div > div.wds-tab__content.wds-is-current > figure > a"
          );

        let imgLink =
          img.length !== 0
            ? await img[0].evaluate((el) => el.getAttribute("href"))
            : "No image available";
            //'https://static.wikia.nocookie.net/avatar/images/7/79/Pilot_-_Aang.png/revision/latest?cb=20120311133235'
            // take the 'revision' part away because some images wont work with the full link that comes from 'https://avatar.fandom.com/'
            // to  https://static.wikia.nocookie.net/avatar/images/7/79/Pilot_-_Aang.png
          let [imgValidated,] = imgLink.split('/revision')

        const nationality = await page.$$(
          "#mw-content-text > div > aside > section:nth-child(3) > div > div > a"
        );
        const nationalityText =
          nationality.length !== 0
            ? await nationality[0].evaluate((el) => el.textContent)
            : "No nationality available";

        obj[index] = {
          name: Name,
          link: `https://avatar.fandom.com${characterPage}`,
          image: imgValidated,
          nationality: nationalityText,
        };
        fs.writeFileSync(__dirname + "/characters.json", JSON.stringify(obj));


        await page.close();
        index++;
        printInTerminal(Name, index);
      }
    }


    let nextTextSpan = await page.$$(
      "#mw-content-text > div.category-page__pagination > a.category-page__pagination-next.wds-button.wds-is-secondary > span"
    );
    if (nextTextSpan.length === 0) nextTextSpan = false;

    const nextLinkPage =
      nextTextSpan !== false
        ? await page.$$(
            "#mw-content-text > div.category-page__pagination > a.category-page__pagination-next.wds-button.wds-is-secondary"
          )
        : false;

    const hrefNext =
      nextLinkPage !== false
        ? await nextLinkPage[0].evaluate((el) => el.getAttribute("href"))
        : false;

    url = hrefNext;
    doesNextExist =
      nextTextSpan !== false
        ? await nextTextSpan[0].evaluate((el) => el.textContent)
        : false;
    if (doesNextExist === false) {
      console.log(colors.white(` No more characters left!`));
    }

    await browser.close();
  } while (doesNextExist);
})();

function printInTerminal(Name, index) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(
    colors.cyan(
      `Character "${colors.white(Name)}" was saved with index ${colors.white(index)} `
    )
  );
}
