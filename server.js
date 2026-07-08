// server.js - Backend Fharoo (sin Puppeteer, con axios + cheerio)
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

        // Hacer la petición HTTP
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Buscar la tabla de pareos
        const pairings = [];
        let foundTable = false;

        // Buscar todas las tablas que contengan los encabezados de pareos
        $('table').each((index, table) => {
            const tableText = $(table).text();
            if (tableText.includes('Mesa') && tableText.includes('Blancas') && tableText.includes('Negras')) {
                foundTable = true;
                // Procesar las filas de la tabla
                $(table).find('tr').each((rowIndex, row) => {
                    const cols = $(row).find('td');
                    if (cols.length >= 6) {
                        // Saltar la fila de encabezados
                        const firstColText = $(cols[0]).text().trim();
                        if (firstColText === '' || firstColText === 'Mesa') return;

                        const mesa = parseInt(firstColText) || 0;
                        const blanco = $(cols[2]).text().trim().replace(/^[A-Z]+\s+/, '') || 'Sin nombre';
                        const ratingBlanco = parseInt($(cols[1]).text().trim()) || 0;
                        const negro = $(cols[4]).text().trim().replace(/^[A-Z]+\s+/, '') || 'Sin nombre';
                        const ratingNegro = parseInt($(cols[3]).text().trim()) || 0;
                        let resultado = $(cols[5]).text().trim() || '';

                        if (mesa > 0) {
                            pairings.push({
                                mesa: mesa,
                                blanco: blanco,
                                ratingBlanco: ratingBlanco,
                                negro: negro,
                                ratingNegro: ratingNegro,
                                resultado: resultado,
                                nota: ''
                            });
                        }
                    }
                });
            }
        });

        if (!foundTable || pairings.length === 0) {
            console.log('⚠️ No se encontraron pareos en la página.');
            return res.status(404).json({
                error: 'No se encontraron pareos en la página. Verifica que la URL sea correcta y que la ronda esté disponible.'
            });
        }

        // Extraer el número de ronda de la URL
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
            error: 'Error al extraer datos: ' + (error.message || 'Error desconocido')
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Fharoo Backend corriendo en puerto ${PORT}`);
});
