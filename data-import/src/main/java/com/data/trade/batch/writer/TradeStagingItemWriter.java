package com.data.trade.batch.writer;

import com.data.trade.model.TradeStaging;
import com.data.trade.repository.TradeStagingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ItemWriter;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TradeStagingItemWriter implements ItemWriter<TradeStaging> {
    
    private final TradeStagingRepository tradeStagingRepository;
    
    @Override
    public void write(Chunk<? extends TradeStaging> chunk) throws Exception {
        log.debug("Writing chunk of {} items to staging table", chunk.size());
        tradeStagingRepository.saveAll(chunk.getItems());
    }
}

