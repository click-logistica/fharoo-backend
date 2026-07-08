// server.js - Backend Fharoo (Versión ES Module)
import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        nombre: 'Fharoo Backend',
        version: '1.0.0',
        estado: '✅ Funcionando correctamente'
    });
});

app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Falta la URL de Chess-Results.' });
    }

    if (!url.includes('chess-results.com')) {
        return res.status(400).json({ error: 'URL inválida. Debe ser de Chess-Results.' });
    }

    try {
        console.log(`🔍 Extrayendo datos de: ${url}`);

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Esperar a que la tabla de pareos esté cargada
        await page.waitForSelector('table[class="CRs1"]', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontró la tabla principal, intentando con selectores alternativos...');
        });

        const pairings = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            let pairingTable = null;

            for (const table of tables) {
                const text = table.textContent || '';
                if (text.includes('Mesa') && text.includes('Blancas') && text.includes('Negras')) {
                    pairingTable = table;
                    break;
                }
            }

            if (!pairingTable) return [];

            const rows = pairingTable.querySelectorAll('tr');
            const data = [];
            let isHeader = true;

            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (isHeader) {
                    isHeader = false;
                    return;
                }
                if (cols.length >= 6) {
                    let resultado = cols[5]?.textContent?.trim() || '';
                    if (resultado === '') resultado = '';

                    data.push({
                        mesa: parseInt(cols[0]?.textContent?.trim() || '0'),
                        blanco: cols[2]?.textContent?.trim()?.replace(/^[A-Z]+\s+/, '') || 'Sin nombre',
                        ratingBlanco: parseInt(cols[1]?.textContent?.trim() || '0'),
                        negro: cols[4]?.textContent?.trim()?.replace(/^[A-Z]+\s+/, '') || 'Sin nombre',
                        ratingNegro: parseInt(cols[3]?.textContent?.trim() || '0'),
                        resultado: resultado,
                        nota: ''
                    });
                }
            });

            return data;
        });

        await browser.close();

        const roundMatch = url.match(/rd=(\d+)/);
        const round = roundMatch ? parseInt(roundMatch[1]) : '?';

        console.log(`✅ Extraídas ${pairings.length} mesas de la ronda ${round}`);

        res.json({
            success: true,
            round: round,
            total: pairings.length,
            pairings: pairings
        });

    } catch (error) {
        console.error('❌ Error en scraping:', error);
        res.status(500).json({
            error: 'Error al extraer datos: ' + error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Fharoo Backend corriendo en puerto ${PORT}`);
});