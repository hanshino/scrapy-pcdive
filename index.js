const { Builder } = require("selenium-webdriver");
const cheerio = require("cheerio");
const wikiURL = "https://pcredivewiki.tw";

let driver = new Builder()
  .forBrowser("chrome")
  .usingServer("http://localhost:4444/wd/hub")
  .build();

(async () => {
  let characters = await getCharacters();
  characters = await addCharacterStand(characters);

  for (let i = 0; i < characters.length; i++) {
    let info = await getEquipInfo(characters[i].Name);
    let matchResult = characters[i].HeadImage.match(/icon_unit_(?<unitId>\d+)/);

    let unitId = "0";
    if (matchResult) {
      idArray = matchResult.groups.unitId.split("");
      idArray[4] = "0";
      unitId = idArray.join("");
    }

    characters[i] = {
      ...info,
      ...characters[i],
      HeadImage: wikiURL + characters[i].HeadImage,
      unitId,
    };
  }

  await driver.quit();
})();

async function getCharacters() {
  let $ = await getJQuery(`${wikiURL}/Character`);
  let result = [];
  let stars = ["1星", "2星", "3星"];

  stars.forEach((star, index) => {
    $('h3:contains("' + star + '")')
      .siblings("div")
      .each((i, e) => {
        let temp = {
          Name: decodeURI(
            $(e).find("a").attr("href").replace("/Character/Detail/", "")
          ),
          HeadImage: $(e).find("img").attr("src"),
          Star: index + 1,
        };

        result.push(temp);
      });
  });

  return result;
}

/**
 * 取得角色站位
 */
async function addCharacterStand(characters) {
  let $ = await getJQuery(`${wikiURL}/Stand`);

  characters.forEach((character) => {
    let stand = $(`#${character.Name} span`).last().text();
    console.log(character.Name, stand);
    character.Stand = parseInt(stand);
  });

  return characters;
}

async function getJQuery(url) {
  await driver.get(url);
  let body = await driver.getPageSource();
  let $ = cheerio.load(body);

  return $;
}

async function getEquipInfo(characterName) {
  let url = `${wikiURL}/Character/Detail/${encodeURI(characterName)}`;
  let $ = await getJQuery(url);
  console.log("Go to " + url);

  let equipArea = $('h3:contains("專用裝備")');
  let uniqueEquip = {};

  if (equipArea.length !== 0) {
    equipArea = equipArea.next().find("div.prod-info-box");
    let equipName = equipArea.find("h2").text();
    let equipDescription = equipArea.find("p").text();
    let equipImage = wikiURL + equipArea.find("img").attr("src");
    let equipStatus = [];

    equipArea.find(".title").each((i, e) => {
      equipStatus.push({
        title: $(e)
          .text()
          .replace(/[\n\t]/g, ""),
        value: $(e)
          .siblings()
          .text()
          .replace(/[\n\t]/g, ""),
      });
    });

    uniqueEquip = {
      Name: equipName,
      Description: equipDescription,
      Image: equipImage,
      Status: equipStatus,
    };
  }

  let requireEquip = [];
  let rank = 0;

  while (true) {
    let equipRequire = $("#nav-" + rank);

    if (equipRequire.length === 0) break;

    let temp = {};
    temp.Rank = rank + 1;
    temp.Equips = [];

    equipRequire.find("a").each(function () {
      temp.Equips.push({
        Name: decodeURI($(this).attr("href")).replace("/Equipment/Detail/", ""),
        Image: wikiURL + $(this).find("img").attr("src"),
      });
    });

    requireEquip.push(temp);

    rank++;
  }

  let characterInfo = {};

  $(".chara-table tr").each(function (i) {
    if (i > 10) return;
    characterInfo[
      $(this)
        .find("th")
        .text()
        .replace(/[\n\t]/g, "")
    ] = $(this)
      .find("td")
      .text()
      .replace(/[\n\t]/g, "");
  });

  let characterAction = {
    Start: [],
    Loop: [],
  };

  $('h4:contains("起手")')
    .next()
    .find("img")
    .each(function () {
      characterAction.Start.push(wikiURL + $(this).attr("src"));
    });

  $('h4:contains("循環")')
    .next()
    .find("img")
    .each(function () {
      characterAction.Loop.push(wikiURL + $(this).attr("src"));
    });

  var skillArea = $('h3:contains("技能")').siblings("div");
  var characterSkills = [];

  skillArea.each(function () {
    let skillType = $(this).find("div.skill-type").text();
    let skillName = $(this).find("h3.skill-name").text();
    let re = new RegExp(
      "(" + [skillType, skillName, "[\n\t+]"].join("|") + ")",
      "gi"
    );
    let skillDescription = $(this)
      .find("div.skill-description")
      .text()
      .replace(re, "");
    let skillEffect = [];

    $(this)
      .find("div.skill-effect")
      .find("div.mb-2")
      .each(function () {
        let data = $(this)
          .text()
          .replace(/[\r\n\t]/g, "")
          .trim();
        if (data == "") return;
        skillEffect.push(data);
      });

    characterSkills.push({
      type: skillType.trim(),
      name: skillName.trim(),
      image: wikiURL + $(this).find("img").attr("src"),
      description: skillDescription.trim(),
      effect: skillEffect,
    });
  });

  return {
    Name: characterName,
    Image:
      wikiURL +
      $('h2:contains("角色圖")').next().find("img").last().attr("src"),
    Info: characterInfo,
    Equip: requireEquip,
    Unique: uniqueEquip,
    Action: characterAction,
    Skill: characterSkills,
  };
}
