package com.data.trade.batch.processor;

import com.data.trade.model.TradeStaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class TradeStagingItemProcessor implements ItemProcessor<TradeStaging, TradeStaging> {
    
    @Override
    public TradeStaging process(TradeStaging item) {
        // Additional validation/transformation if needed
        // For now, just return as-is since validation is done in reader
        
        // Ensure code is uppercase
        if (item.getCode() != null) {
            item.setCode(item.getCode().trim().toUpperCase());
        }
        
        // Ensure side is lowercase
        if (item.getSide() != null) {
            item.setSide(item.getSide().trim().toLowerCase());
        }
        
        return item;
    }
}

