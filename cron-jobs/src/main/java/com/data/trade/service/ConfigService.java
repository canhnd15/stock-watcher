package com.data.trade.service;

import com.data.trade.model.AppConfig;
import com.data.trade.repository.AppConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConfigService {
    
    private final AppConfigRepository appConfigRepository;
    
    public boolean isVn30CronEnabled() {
        return appConfigRepository.findByConfigKey("vn30.cron.enabled")
                .map(config -> "true".equalsIgnoreCase(config.getConfigValue()))
                .orElse(true); // Default to enabled
    }
    
    public void setVn30CronEnabled(boolean enabled) {
        AppConfig config = appConfigRepository.findByConfigKey("vn30.cron.enabled")
                .orElse(AppConfig.builder()
                        .configKey("vn30.cron.enabled")
                        .description("Enable/disable VN30 stock ingestion cron job")
                        .build());
        
        config.setConfigValue(String.valueOf(enabled));
        appConfigRepository.save(config);
    }
    
    public boolean isTrackedStocksCronEnabled() {
        return appConfigRepository.findByConfigKey("tracked.stocks.cron.enabled")
                .map(config -> "true".equalsIgnoreCase(config.getConfigValue()))
                .orElse(true); // Default to enabled
    }
    
    public void setTrackedStocksCronEnabled(boolean enabled) {
        AppConfig config = appConfigRepository.findByConfigKey("tracked.stocks.cron.enabled")
                .orElse(AppConfig.builder()
                        .configKey("tracked.stocks.cron.enabled")
                        .description("Enable/disable tracked stocks refresh and recommendation cron job")
                        .build());
        
        config.setConfigValue(String.valueOf(enabled));
        appConfigRepository.save(config);
    }
    
    public boolean isSignalCalculationCronEnabled() {
        return appConfigRepository.findByConfigKey("signal.calculation.cron.enabled")
                .map(config -> "true".equalsIgnoreCase(config.getConfigValue()))
                .orElse(true); // Default to enabled
    }
    
    public void setSignalCalculationCronEnabled(boolean enabled) {
        AppConfig config = appConfigRepository.findByConfigKey("signal.calculation.cron.enabled")
                .orElse(AppConfig.builder()
                        .configKey("signal.calculation.cron.enabled")
                        .description("Enable/disable signal calculation and notification cron job")
                        .build());
        
        config.setConfigValue(String.valueOf(enabled));
        appConfigRepository.save(config);
    }
    
    public boolean isBackupCronEnabled() {
        return appConfigRepository.findByConfigKey("backup.cron.enabled")
                .map(config -> "true".equalsIgnoreCase(config.getConfigValue()))
                .orElse(true); // Default to enabled
    }
    
    public void setBackupCronEnabled(boolean enabled) {
        AppConfig config = appConfigRepository.findByConfigKey("backup.cron.enabled")
                .orElse(AppConfig.builder()
                        .configKey("backup.cron.enabled")
                        .description("Enable/disable daily trades backup cron job")
                        .build());
        
        config.setConfigValue(String.valueOf(enabled));
        appConfigRepository.save(config);
    }
}

