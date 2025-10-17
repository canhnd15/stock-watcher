SELECT
    COUNT(CASE WHEN side = 'sell' AND volume >= 100000 THEN 1 END) AS sell_ge_100k,
    COUNT(CASE WHEN side = 'sell' AND volume BETWEEN 10000 AND 100000 THEN 1 END) AS sell_10k_100k,
    COUNT(CASE WHEN side = 'buy'  AND volume >= 100000 THEN 1 END) AS buy_ge_100k,
    COUNT(CASE WHEN side = 'buy'  AND volume BETWEEN 10000 AND 100000 THEN 1 END) AS buy_10k_100k
FROM trades
WHERE code = 'TCB';

select distinct code from trades;

SELECT
    code,
    COUNT(CASE WHEN side = 'sell' AND volume >= 100000 THEN 1 END) AS sell_ge_100k,
    COUNT(CASE WHEN side = 'sell' AND volume BETWEEN 10000 AND 100000 THEN 1 END) AS sell_10k_100k,
    COUNT(CASE WHEN side = 'buy'  AND volume >= 100000 THEN 1 END) AS buy_ge_100k,
    COUNT(CASE WHEN side = 'buy'  AND volume BETWEEN 10000 AND 100000 THEN 1 END) AS buy_10k_100k
FROM trades
WHERE code IN (select distinct code from trades)
GROUP BY code
ORDER BY buy_10k_100k desc;
