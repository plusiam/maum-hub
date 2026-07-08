// 긍정 카드 메이커 캔버스 줄바꿈 로직(breakLines, getOptimalFontSize) 스모크 테스트 — 실행: node tests/breaklines.test.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
    path.join(__dirname, '..', 'positive-card-maker', 'index.html'),
    'utf8'
);

// HTML 안의 인라인 함수를 추출해 평가 (원본 수정 없이 동일 코드를 검증)
function extract(name) {
    const match = html.match(new RegExp(`function ${name}[\\s\\S]*?\\n        \\}`));
    if (!match) {
        console.error(`FAIL ${name} 함수를 index.html에서 찾지 못했습니다.`);
        process.exit(1);
    }
    return match[0];
}

eval(extract('breakLines').replace('function breakLines', 'global.breakLines = function'));
eval(extract('getOptimalFontSize').replace('function getOptimalFontSize', 'global.getOptimalFontSize = function'));

// 글자 폭을 폰트 크기에 비례해 흉내 내는 스텁 컨텍스트
function stubCtx() {
    const ctx = {
        font: '48px stub',
        measureText(text) {
            const size = parseInt(ctx.font, 10) || 16;
            return { width: text.length * size * 0.9 };
        }
    };
    return ctx;
}

let failed = 0;
function check(name, actual, expected) {
    const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} → ${JSON.stringify(actual)}`);
    if (!ok) failed++;
}

const ctx = stubCtx();
ctx.font = '10px stub'; // 글자당 9px
const maxWidth = 90;    // 10글자 폭

// 1. 공백 기준 정상 줄바꿈 — 내용 손실 없음
check('공백 단어 줄바꿈',
    breakLines(ctx, '나는 세상에서 가장 소중한 존재야', maxWidth).join(' '),
    '나는 세상에서 가장 소중한 존재야');

// 2. 공백 없는 긴 한글은 글자 단위 분할 (핵심 회귀 방지)
const longText = '가나다라마바사아자차카타파하가나다라마바사아자차';
check('공백 없는 25글자 분할', breakLines(ctx, longText, maxWidth), lines =>
    lines.join('') === longText && lines.every(l => ctx.measureText(l).width <= maxWidth));

// 3. 어떤 줄도 maxWidth를 넘지 않음
check('혼합 문장 폭 준수', breakLines(ctx, '짧다 가나다라마바사아자차카타 끝', maxWidth), lines =>
    lines.every(l => ctx.measureText(l).width <= maxWidth));

// 4. 빈 문자열은 빈 배열
check('빈 문자열', breakLines(ctx, '', maxWidth).length, 0);

// 5. getOptimalFontSize는 최소 16px 아래로 내려가지 않음
const tiny = stubCtx();
const size = getOptimalFontSize(tiny, [longText, longText, longText, longText], 100, 50);
check('최소 폰트 크기 16 보장', size, s => s >= 16);

// 6. 짧은 텍스트는 큰 폰트 유지
const roomy = stubCtx();
const bigSize = getOptimalFontSize(roomy, ['안녕'], 400, 500);
check('짧은 텍스트 큰 폰트', bigSize, s => s > 30);

process.exit(failed ? 1 : 0);
