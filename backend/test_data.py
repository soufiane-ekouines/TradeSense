import yfinance as yf

def test_fetch():
    print("Testing yfinance fetch for BTC-USD...")
    try:
        ticker = yf.Ticker("BTC-USD")
        df = ticker.history(period='1d', interval='1m')
        if df.empty:
            print("ERROR: Result empty.")
        else:
            print(f"SUCCESS: Fetched {len(df)} rows.")
            print(df.head())
    except Exception as e:
        print(f"ERROR: Exception occurred: {e}")

if __name__ == "__main__":
    test_fetch()
