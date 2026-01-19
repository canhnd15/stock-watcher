package com.data.trade.batch.config;

import com.data.trade.batch.processor.TradeStagingItemProcessor;
import com.data.trade.batch.reader.ExcelTradeItemReader;
import com.data.trade.batch.writer.TradeStagingItemWriter;
import com.data.trade.model.TradeStaging;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class TradeDataImportBatchConfig {
    
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final TradeStagingItemWriter tradeStagingItemWriter;
    private final TradeStagingItemProcessor tradeStagingItemProcessor;
    
    @Bean
    public Job tradeDataImportJob(Step importToStagingStep) {
        return new JobBuilder("tradeDataImportJob", jobRepository)
                .start(importToStagingStep)
                .build();
    }
    
    @Bean
    public Step importToStagingStep(
            ItemReader<TradeStaging> excelTradeItemReader) {
        return new StepBuilder("importToStagingStep", jobRepository)
                .<TradeStaging, TradeStaging>chunk(5000, transactionManager)
                .reader(excelTradeItemReader)
                .processor(tradeStagingItemProcessor)
                .writer(tradeStagingItemWriter)
                .faultTolerant()
                .skip(Exception.class)
                .skipLimit(1000) // Allow up to 1000 skipped records per file
                .build();
    }
    
    @Bean
    @StepScope
    public ItemReader<TradeStaging> excelTradeItemReader(
            @Value("#{jobParameters['input.file']}") String filePath) {
        Resource resource = new FileSystemResource(filePath);
        return new ExcelTradeItemReader(resource);
    }
}

