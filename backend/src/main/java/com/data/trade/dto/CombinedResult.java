package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Combined result from all 4 formulas
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CombinedResult {
    private double weightedScore; // Combined weighted score (-100 to +100)
    private int buyVotes; // Number of formulas voting BUY
    private int sellVotes; // Number of formulas voting SELL
    private int neutralVotes; // Number of formulas voting NEUTRAL
    private double consensus; // Agreement level (0.0 to 1.0)
    private double confidence; // Average confidence across formulas
    private List<FormulaResult> formulaDetails; // Individual formula results
}



