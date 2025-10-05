const AppError = require('../errors/AppError');

const sampleHtml = `
<html>
  <body>
    <section data-name="acomodacoes">
      <div class="row borda-cor" data-codigo="101">
        <h3 data-campo="titulo">Suíte Master</h3>
        <div class="quarto descricao">Quarto amplo com vista para o mar.</div>
        <img src="https://example.com/master.jpg" />
        <div class="row tarifa">
          <h4 data-campo="nome">Hospedagem</h4>
          <b data-campo="valor">R$ 450,00</b>
        </div>
      </div>
      <div class="row borda-cor" data-codigo="102">
        <h3 data-campo="titulo">Standard Duplo</h3>
        <div class="quarto descricao">Ideal para duas pessoas.</div>
        <img src="https://example.com/standard.jpg" />
        <div class="row tarifa">
          <h4 data-campo="nome">Pacote</h4>
          <b data-campo="valor">R$ 280,00</b>
        </div>
      </div>
    </section>
  </body>
</html>
`;

jest.mock('../services/BrowserService', () => ({
  getBrowser: jest.fn(),
  createPage: jest.fn(),
  navigateToPage: jest.fn(),
  waitForSelector: jest.fn(),
  getPageHTML: jest.fn(),
  closeBrowser: jest.fn()
}));

const BrowserService = require('../services/BrowserService');
const SearchService = require('../services/SearchService');

const createPageStub = () => {
  const responseListeners = new Set();
  const waiters = [];

  const page = {
    waitForResponse: jest.fn((predicate) => new Promise((resolve) => {
      waiters.push({ predicate, resolve });
    })),
    on: jest.fn((event, handler) => {
      if (event === 'response') {
        responseListeners.add(handler);
      }
    }),
    removeListener: jest.fn((event, handler) => {
      if (event === 'response') {
        responseListeners.delete(handler);
      }
    }),
    emitResponse(response) {
      responseListeners.forEach((handler) => handler(response));

      for (let index = waiters.length - 1; index >= 0; index -= 1) {
        const waiter = waiters[index];
        if (!waiter.predicate || waiter.predicate(response)) {
          waiter.resolve(response);
          waiters.splice(index, 1);
        }
      }
    },
    createResponse({
      url = 'https://reservations3.fasthotel.com.br/reservaMotorCotar/214',
      statusCode = 200,
      body = '{}'
    } = {}) {
      return {
        url: () => url,
        status: () => statusCode,
        text: () => Promise.resolve(body)
      };
    }
  };

  return page;
};

const resetBrowserServiceMock = () => {
  jest.clearAllMocks();
};

describe('SearchService utility methods', () => {
  it('extractPrices should collect hospedagem and pacote values', () => {
    const htmlSnippet = `
      <div class="row borda-cor" data-codigo="101">
        <div class="row tarifa">
          <h4 data-campo="nome">Hospedagem</h4>
          <b data-campo="valor">R$ 450,00</b>
        </div>
      </div>
      <div class="row borda-cor" data-codigo="102">
        <div class="row tarifa">
          <h4 data-campo="nome">Pacote Especial</h4>
          <b data-campo="valor">R$ 600,00</b>
        </div>
      </div>
    `;

    const prices = SearchService.extractPrices(htmlSnippet);

    expect(prices).toEqual({
      hospedagem: 'R$ 450,00',
      pacote: 'R$ 600,00'
    });
  });

  it('extractAccommodations should parse accommodation blocks', () => {
    const accommodations = SearchService.extractAccommodations(sampleHtml);

    expect(accommodations).toEqual([
      {
        name: 'Suíte Master',
        description: 'Quarto amplo com vista para o mar.',
        price: 'R$ 450,00',
        image: 'https://example.com/master.jpg'
      },
      {
        name: 'Standard Duplo',
        description: 'Ideal para duas pessoas.',
        price: 'R$ 280,00',
        image: 'https://example.com/standard.jpg'
      }
    ]);
  });

  it('processRawData should report metadata and accommodations', () => {
    const result = SearchService.processRawData(sampleHtml);

    expect(result.processed).toBe(true);
    expect(result.accommodationsCount).toBe(2);
    expect(result.accommodations[0].name).toBe('Suíte Master');
  });

  it('isReservationEndpoint should identify reservation URLs', () => {
    expect(SearchService.isReservationEndpoint('https://reservations3.fasthotel.com.br/reservaMotorCotar/214')).toBe(true);
    expect(SearchService.isReservationEndpoint('https://reservations3.fasthotel.com.br/other')).toBe(false);
  });
});

describe('SearchService.search', () => {
  let pageStub;
  const browserStub = { id: 'browser-stub' };

  beforeEach(() => {
    resetBrowserServiceMock();
    pageStub = createPageStub();

    BrowserService.getBrowser.mockResolvedValue(browserStub);
    BrowserService.createPage.mockResolvedValue(pageStub);
    BrowserService.waitForSelector.mockResolvedValue();
    BrowserService.getPageHTML.mockResolvedValue(sampleHtml);
    BrowserService.closeBrowser.mockResolvedValue();
  });

  it('should return accommodations when reservation API succeeds', async () => {
    BrowserService.navigateToPage.mockImplementation(async () => {
      const response = pageStub.createResponse({
        statusCode: 200,
        body: JSON.stringify({ status: 'success' })
      });
      pageStub.emitResponse(response);
    });

    const accommodations = await SearchService.search('2025-12-19', '2025-12-23');

    expect(accommodations).toHaveLength(2);
    expect(accommodations[0].name).toBe('Suíte Master');
    expect(BrowserService.navigateToPage).toHaveBeenCalledWith(
      pageStub,
      expect.stringContaining('entrada=2025-12-19')
    );
    expect(BrowserService.closeBrowser).toHaveBeenCalledWith(browserStub);
    expect(pageStub.removeListener).toHaveBeenCalledWith('response', expect.any(Function));
  });

  it('should throw an AppError when reservation API responds with error', async () => {
    const errorPayload = {
      status: 'error',
      message: 'Mocked restriction message'
    };

    BrowserService.navigateToPage.mockImplementation(async () => {
      const response = pageStub.createResponse({
        statusCode: 400,
        body: JSON.stringify(errorPayload)
      });
      pageStub.emitResponse(response);
    });

    let caughtError;
    try {
      await SearchService.search('2025-12-19', '2025-12-23');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(AppError);
    expect(caughtError).toMatchObject({
      code: 'RESERVATION_API_ERROR',
      statusCode: 400,
      details: expect.objectContaining({ payload: errorPayload })
    });

    expect(BrowserService.getPageHTML).not.toHaveBeenCalled();
    expect(BrowserService.closeBrowser).toHaveBeenCalledWith(browserStub);
  });
});
