const BrowserService = require('./BrowserService');
const AppError = require('../errors/AppError');

class SearchService {
  constructor(checkin, checkout, browserService) {
    this.checkin = checkin;
    this.checkout = checkout;
    this.browserService = browserService;
  }

  static async search(checkin, checkout) {
    let browser = null;
    let page = null;
    let reservationMonitor = null;

    try {
      if (!checkin || !checkout) {
        throw new AppError('Checkin and checkout dates are required', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: { checkin, checkout }
        });
      }

      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);

      if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
        throw new AppError('Invalid date format. Use YYYY-MM-DD', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: { checkin, checkout }
        });
      }

      if (checkoutDate <= checkinDate) {
        throw new AppError('Checkout date must be after checkin date', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: { checkin, checkout }
        });
      }

      browser = await BrowserService.getBrowser();
      page = await BrowserService.createPage(browser);

      reservationMonitor = this.setupReservationErrorMonitor(page);
      const reservationResponsePromise = page.waitForResponse(
        response => this.isReservationEndpoint(response.url()),
        { timeout: 20000 }
      ).catch(() => null);

      const url = `https://reservations3.fasthotel.com.br/188/214?entrada=${checkin}&saida=${checkout}&adultos=1#acomodacoes`;

      await BrowserService.navigateToPage(page, url);

      await reservationResponsePromise;

      const initialReservationError = reservationMonitor?.getError();
      if (initialReservationError) {
        throw new AppError(initialReservationError.message, {
          statusCode: initialReservationError.statusCode || 502,
          code: 'RESERVATION_API_ERROR',
          details: initialReservationError
        });
      }

      await BrowserService.waitForSelector(page, '.row.row-shadow.row-roundy.animated.slideInDown.fast');

      const reservationErrorAfterLoad = reservationMonitor?.getError();
      if (reservationErrorAfterLoad) {
        throw new AppError(reservationErrorAfterLoad.message, {
          statusCode: reservationErrorAfterLoad.statusCode || 502,
          code: 'RESERVATION_API_ERROR',
          details: reservationErrorAfterLoad
        });
      }

      const pageHTML = await BrowserService.getPageHTML(page);

      const processedData = this.processRawData(pageHTML);

      if (!processedData.processed) {
        throw new AppError(processedData.error || 'Failed to process accommodation data', {
          statusCode: 502,
          code: 'DATA_PROCESSING_ERROR',
          details: processedData
        });
      }

      return processedData.accommodations;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error?.message || '';
      if (typeof message === 'string' && (message.toLowerCase().includes('timeout'))) {
        const timeoutError = new AppError('The website took too long to respond. Please try again later.', {
          statusCode: 504,
          code: 'NAVIGATION_TIMEOUT',
          details: { message }
        });
        throw timeoutError;
      }

      throw new AppError('Unexpected error while searching for rooms', {
        statusCode: 500,
        code: 'SEARCH_SERVICE_ERROR',
        details: {
          message: error?.message,
          name: error?.name
        },
        cause: error
      });
    } finally {
      if (reservationMonitor) {
        reservationMonitor.dispose();
      }
      if (browser) {
        await BrowserService.closeBrowser(browser);
      }
    }
  }

  static setupReservationErrorMonitor(page) {
    if (!page) {
      throw new Error('Page instance is required to monitor reservation errors');
    }

    const targetRegex = /https:\/\/reservations3\.fasthotel\.com\.br\/reservaMotorCotar\//i;
    const state = { error: null };

    const handler = async (response) => {
      if (state.error) {
        return;
      }

      const responseUrl = response.url();
      if (!targetRegex.test(responseUrl)) {
        return;
      }

      try {
        const statusCode = response.status();
        let payload = null;

        try {
          const text = await response.text();
          if (text) {
            payload = JSON.parse(text);
          }
        } catch (parseError) {
          // Ignore JSON parsing errors; payload remains null
        }

        const isStatusError = statusCode >= 400;
        const payloadIndicatesError = payload && (payload.status === 'error' || payload.sucesso === false);

        if (isStatusError || payloadIndicatesError) {
          const messageFromPayload = payload && (payload.message || payload.mensagem || payload.error);
          const message = messageFromPayload || `Error in reservaMotorCotar request (status ${statusCode})`;

          state.error = {
            message,
            statusCode,
            payload,
            url: responseUrl
          };
        }
      } catch (error) {
        throw new AppError('Error analyzing reservationMotorCotar response:', {
          statusCode: 500,
          code: 'RESERVATION_API_ERROR',
          details: error
        });
      }
    };

    page.on('response', handler);

    return {
      getError: () => state.error,
      dispose: () => {
        page.removeListener('response', handler);
      }
    };
  }

  static isReservationEndpoint(url) {
    if (!url) {
      return false;
    }
    return /https:\/\/reservations3\.fasthotel\.com\.br\/reservaMotorCotar\//i.test(url);
  }

  static processRawData(htmlContent) {
    try {
      const accommodations = this.extractAccommodations(htmlContent);

      return {
        processed: true,
        accommodations: accommodations,
        accommodationsCount: accommodations.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  static extractAccommodations(htmlContent) {
    const accommodations = [];

    try {
      const sectionMatch = htmlContent.match(/<section[^>]*data-name="acomodacoes"[^>]*>([\s\S]*?)<\/section>/);
      if (!sectionMatch) {
        return [];
      }

      const sectionHtml = sectionMatch[1];

      const accommodationRegex = /<div class="row borda-cor" data-codigo="(\d+)"[^>]*>([\s\S]*?)(?=<div class="row borda-cor" data-codigo="\d+"|$)/g;

      let match;
      while ((match = accommodationRegex.exec(sectionHtml)) !== null) {
        const accommodationHtml = match[0];
        const accommodationData = this.parseAccommodation(accommodationHtml);

        if (accommodationData) {
          accommodations.push(accommodationData);
        }
      }

      return accommodations;
    } catch (error) {
      throw new AppError('Error extracting accommodations:', {
        statusCode: 500,
        code: 'ACCOMMODATION_EXTRACTION_ERROR',
        details: error
      });
    }
  }

  static parseAccommodation(html) {
    try {
      const nameMatch = html.match(/<h3[^>]*data-campo="titulo"[^>]*>([^<]+)<\/h3>/);
      const name = nameMatch ? nameMatch[1].trim() : 'Name not found';

      const descriptionMatch = html.match(/<div class="quarto descricao">([\s\S]*?)<\/div>/);
      const description = descriptionMatch ?
        descriptionMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() :
        'Description not found';

      const imageMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      const image = imageMatch ? imageMatch[1] : '';

      const prices = this.extractPrices(html);
      const price = prices.hospedagem || prices.pacote || 'Price not available';

      return {
        name: name,
        description: description,
        price: price,
        image: image
      };
    } catch (error) {
      throw new AppError('Error parsing accommodation:', {
        statusCode: 500,
        code: 'ACCOMMODATION_PARSING_ERROR',
        details: error
      });
    }
  }

  static extractPrices(html) {
    const prices = {
      hospedagem: null,
      pacote: null
    };

    try {
      const tarifaRegex = /<div class="row tarifa"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
      let tarifaMatch;

      while ((tarifaMatch = tarifaRegex.exec(html)) !== null) {
        const tarifaHtml = tarifaMatch[1];

        const nomeMatch = tarifaHtml.match(/<h4[^>]*data-campo="nome"[^>]*>([^<]+)<\/h4>/);
        const nome = nomeMatch ? nomeMatch[1].toLowerCase() : '';

        const valorMatch = tarifaHtml.match(/<b[^>]*data-campo="valor"[^>]*>([^<]+)<\/b>/);
        const valor = valorMatch ? valorMatch[1].trim() : '';

        if (nome.includes('hospedagem')) {
          prices.hospedagem = valor;
        } else if (nome.includes('pacote') || nome.includes('natal') || nome.includes('reveillon')) {
          prices.pacote = valor;
        }
      }

      return prices;
    } catch (error) {
      throw new AppError('Error extracting prices:', {
        statusCode: 500,
        code: 'PRICE_EXTRACTION_ERROR',
        details: error
      });
    }
  }
}

module.exports = SearchService;
