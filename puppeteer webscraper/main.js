
/*
sample urls
    https://www.xinmeitulu.com/mote/ninjaazhaizhai
    https://www.xinmeitulu.com/mote/baiyin81
    https://www.xinmeitulu.com/mote/coserxiaocangqiandaiw
    https://www.xinmeitulu.com/mote/chunmomo
    https://tw.xinmeitulu.com/mote/cosermizhimaoqiu
    https://tw.xinmeitulu.com/mote/coseryanjiangdamowangw
*/
main_url = process.argv[2]
directory = process.argv[3];


console.log(`Main url- ${main_url}`);
console.log(`Input directory- ${directory}`);
var mkdirp = require('mkdirp');
var fs = require('fs');
var request = require('request');

async function getAlbumLinks(url){
    const pupp = require('puppeteer');
    const browser = await pupp.launch({
        headless: true,
        args: [
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*'
        ]
    });
    const page = await browser.newPage();
    await page.goto(url,{
        timeout: 0
    });
    await page.setDefaultNavigationTimeout(0);

    const figures = await page.evaluate(() => {
        let contents = [...document.querySelectorAll('figure[class="figure"] a')];
        return contents.map((con) => con.getAttribute('href').trim());
      });
    
    await browser.close();
    return figures;
}

async function downloadPhotos(urls){
    await tabbedLog("starting to download photos");
    let i = 1;
    for(const url of urls){
        await tabbedLog(`Link number ${i}`);
        i++;
        const pupp = require('puppeteer');
        const browser = await pupp.launch({
            headless: true,
            args: [
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*'
            ]
        });
        const page = await browser.newPage();
        await page.goto(url,{
            timeout: 0
        });
        await page.setDefaultNavigationTimeout(0);

        await tabbedLog("generating desitnation...");
        const dest = await page.evaluate(
            ()=>{
                let contents = [...document.querySelectorAll('div[class="container"] h1[class="h3"]')]
                return contents.map(
                    (con)=>con.textContent.trim()
                );
            }
        );
        let dir = `${directory}\\${dest[0]}`;
        await tabbedLog(`Download destination- ${dir}`);
        if(fs.existsSync(dir)){
            await tabbedLog(`\t${dir} Already downloaded\n`);
            await browser.close();
            continue;
        }

        const photoLinks = await page.evaluate(() => {
            let contents = [...document.querySelectorAll('figure[class="figure"] a')];
            return contents.map((con) => con.getAttribute('href').trim());
        });

        
        await browser.close();
        
        await savePhotos(photoLinks,dest[0]);
    }
}

async function savePhotos(links,dest){
    let dir = `${directory}\\${dest}`;
    await createDir(dir);
    let i = 1;
    for (const link of links){
        const filePath =`${dir}\\${dest} - ${i}.jpg`;

        request.head(link, function(err,res,body){
            request(link).pipe(fs.createWriteStream(filePath));
        });
        

        i++;
    }
}

async function tabbedLog(str){
    console.log(`\t${str}`);
}

async function checkPage(url){
    const pupp = require('puppeteer');
    const browser = await pupp.launch({
        headless: true,
        args: [
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*'
        ]
    });
    const page = await browser.newPage();
    await page.goto(url,{
        timeout: 0
    });
    await page.setDefaultNavigationTimeout(0);

    let folderTitle = await page.evaluate(
        ()=>{
            let contents = [...document.querySelectorAll("title")];
            return contents.map((con)=>con.textContent.trim());
        }
    );
    const pageCount = await page.evaluate(
        ()=>{
            let contents = [...document.querySelectorAll('ul[class="pagination"] li[class="page-item"]')]
            let tmp = contents.map((con)=>con.textContent.trim());
            return tmp != null ? parseInt(tmp[tmp.length-2])  : 1;
        }
    );
    folderTitle = folderTitle.toString().split("|")[0].trim();
    directory = `${directory}${folderTitle}`;
    await tabbedLog(`Main Directory- ${directory}`);
    
    await createDir(directory);
    
    await browser.close();

    return pageCount;
}

async function createDir(dir){
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

async function run(){
    const pages = await checkPage(main_url);
    await tabbedLog(`Number of pages- ${pages}`);
    for(let i = 1; i<=pages; i++){
        console.log(`Page ${i}`);
        const links = await getAlbumLinks(`${main_url}/page/${i}`);
        await tabbedLog(`Links - ${links.length}`);
        await downloadPhotos(links);
    }
}

run();