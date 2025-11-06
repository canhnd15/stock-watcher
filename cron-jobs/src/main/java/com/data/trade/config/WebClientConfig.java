package com.data.trade.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.ZoneId;
import java.util.TimeZone;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient finpathWebClient(@Value("${app.finpath.base-url}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector())
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(c -> c.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector())
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(c -> c.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build());
    }

    @Bean
    public TimeZone appTimeZone(@Value("${app.timezone:Asia/Ho_Chi_Minh}") String tz) {
        TimeZone timeZone = TimeZone.getTimeZone(ZoneId.of(tz));
        TimeZone.setDefault(timeZone);
        return timeZone;
    }
}
