// server.js - Backend Fharoo (CON AXIOX + CHEERIO - SIN CHROME)
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

    if (!url || !url.includes('chess-results.com')) {
        return res.status(400).json({ error: 'URL inválida. Debe ser de Chess-Results.' });
    }

    try {
        console.log('🔍 Extrayendo datos de:', url);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const pairings = [];

        // Buscar todas las tablas
        $('table').each((i, table) => {
            const text = $(table).text();
            if (text.includes('Mesa') && text.includes('Blancas') && text.includes('Negras')) {
                $(table).find('tr').each((j, row) => {
                    const cols = $(row).find('td');
                    if (cols.length >= 6) {
                        const mesa = parseInt($(cols[0]).text().trim());
                        if (mesa > 0) {
                            pairings.push({
                                mesa: mesa,
                                blanco: $(cols[2]).text().trim().replace(/^[A-Z]+\s+/, '') || 'Sin nombre',
                                ratingBlanco: parseInt($(cols[1]).text().trim()) || 0,
                                negro: $(cols[4]).text().trim().replace(/^[A-Z]+\s+/, '') || 'Sin nombre',
                                ratingNegro: parseInt($(cols[3]).text().trim()) || 0,
                                resultado: $(cols[5]).text().trim() || '',
                                nota: ''
                            });
                        }
                    }
                });
            }
        });

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
        console.error('❌ Error:', error.message);
        res.status(500).json({ 
            error: 'Error al extraer datos: ' + error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Fharoo Backend corriendo en puerto ${PORT}`);
});
