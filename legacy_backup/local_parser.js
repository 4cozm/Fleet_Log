const fs = require('fs');
const readline = require('readline');

// 설정값
const TARGET_FILE = '20260226_132646_2117712894.txt';
const WORKER_URL = 'https://your-worker-url.workers.dev/upload';
const REQUEST_ID = 'discord_issued_code_12345'; // 디스코드에서 받은 코드

const TIMESTAMP_REGEX = /^\[ \d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2} \]/;
const HTML_STRIP_REGEX = /<[^>]+>/g;
const NOTIFY_KEYWORDS = ['영향받지 않습니다', '타겟팅할 수 없습니다', '비활성화되었습니다', '공격합니다', '너무 멀리 있습니다', '수 없습니다'];

async function processLogs() {
    const fileStream = fs.createReadStream(TARGET_FILE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const validLogs = [];
    let currentBuffer = "";

    const flushBuffer = () => {
        if (!currentBuffer) return;
        const isCombat = currentBuffer.includes('(combat)');
        const isNotify = currentBuffer.includes('(notify)');
        const hasNotifyKeyword = NOTIFY_KEYWORDS.some(kw => currentBuffer.includes(kw));

        if (isCombat || (isNotify && hasNotifyKeyword)) {
            let cleaned = currentBuffer
                .replace(HTML_STRIP_REGEX, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\*/g, '') // EVE 특유의 * 기호 제거
                .replace(/\s+/g, ' ')
                .trim();
            validLogs.push(cleaned);
        }
        currentBuffer = "";
    };

    for await (const line of rl) {
        if (TIMESTAMP_REGEX.test(line)) {
            flushBuffer();
            currentBuffer = line.trim();
        } else {
            currentBuffer += " " + line.trim();
        }
    }
    flushBuffer();

    // 워커 서버로 전송
    await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: REQUEST_ID, logs: validLogs })
    });
    console.log(`[완료] ${validLogs.length}개의 정제된 로그를 전송했습니다.`);
}

processLogs();